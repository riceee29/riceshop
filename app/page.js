'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RiceStoreMaster() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assets, setAssets] = useState([]);
  const [purchasedIds, setPurchasedIds] = useState([]);
  const [myCharges, setMyCharges] = useState([]); 
  const [adminCharges, setAdminCharges] = useState([]); 
  const [view, setView] = useState('shop'); 
  const [loading, setLoading] = useState(true);
  const [chargeType, setChargeType] = useState('voucher');
  const [adminInput, setAdminInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const ADMIN_PASS = '20140419ju!';

  const LOGO_URL = "https://cdn.discordapp.com/attachments/1449379705546473502/1497840261915480134/Gemini_Generated_Image_rmtwv7rmtwv7rmtw.png?ex=69eefbf2&is=69edaa72&hm=743bba23cb19d2d9392aebe794b30acda7fb3ee6d4b050b7dffd648a9eabf1c8&";

  const WEBHOOKS = {
    BUY: "https://discord.com/api/webhooks/1497845253087170672/hXAS_gMbVq7NUfXtvhgY-vQrCxDN5aYsOcbaReE_0Ank6y-J21X4L7LSh6vaZcQqIIAU",
    CHARGE: "https://discord.com/api/webhooks/1497845401183715399/KwXSgBDoiaLPLdBeCcyJ3nf8P0rqbUbXLbM85mA2-ckyFKdFryrMSVhmk_pgLduximFr",
    JOIN: "https://discord.com/api/webhooks/1497845499640938587/ANIOgZpn69tIf1rkLy3IJKT1klN1jfJ5WuvVKdVGofvdVWqCFr7Imkq2s7GDo2Q8Hu5a",
    UPLOAD: "https://discord.com/api/webhooks/1497846008309223585/T2uAIhQwEvLnydCCQ7Ec9N9aPGXp4Zusx68KyrJwXsfaGYaHhinnJ45EWQLTmWiKg7Ec"
  };

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      setUser(u);
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single();
      setProfile(p || { balance: 0 });
      const { data: pur } = await supabase.from('purchases').select('asset_id').eq('user_id', u.id);
      setPurchasedIds(pur?.map(i => i.asset_id) || []);
      const { data: mc } = await supabase.from('charge_requests').select('*').eq('user_id', u.id).order('created_at', { ascending: false });
      setMyCharges(mc || []);
    }
    const { data: as } = await supabase.from('assets').select('*').order('id', { ascending: false });
    setAssets(as || []);
    const { data: ac } = await supabase.from('charge_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    setAdminCharges(ac || []);
    setLoading(false);
  }

  async function sendWebhook(url, title, message, color) {
    try {
      await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [{ title, description: message, color, thumbnail: { url: LOGO_URL }, timestamp: new Date().toISOString() }] })
      });
    } catch (e) {}
  }

  async function buyAsset(asset) {
    if (!profile || profile.balance < asset.price) return alert('잔액이 부족합니다.');
    const { error } = await supabase.from('profiles').update({ balance: profile.balance - asset.price }).eq('id', user.id);
    if (!error) {
      await supabase.from('purchases').insert({ user_id: user.id, asset_id: asset.id });
      await supabase.from('assets').update({ sales_count: (asset.sales_count || 0) + 1 }).eq('id', asset.id);
      sendWebhook(WEBHOOKS.BUY, "🛍️ 구매 발생", `**유저:** ${user.email}\n**아이템:** ${asset.title}\n**금액:** ${asset.price}원`, 0x00d4ff);
      alert('🎉 구매 완료!'); init();
    }
  }

  async function downloadAsset(asset) {
    const { data, error } = await supabase.storage.from('asset-files').createSignedUrl(asset.file_path, 60);
    if (data?.signedUrl) {
      const a = document.createElement('a'); a.href = data.signedUrl; a.download = `${asset.title}.rbxm`; a.click();
    } else { alert('다운로드 실패: ' + error.message); }
  }

  async function deleteAsset(asset) {
    if (!confirm(`[${asset.title}] 삭제 시 구매 내역까지 모두 강제 삭제됩니다. 진행할까요?`)) return;
    try {
      await supabase.from('purchases').delete().eq('asset_id', asset.id);
      await supabase.from('assets').delete().eq('id', asset.id);
      if (asset.file_path) await supabase.storage.from('asset-files').remove([asset.file_path]);
      alert('삭제 성공'); init();
    } catch (e) { alert('삭제 실패: ' + e.message); }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (adminInput !== ADMIN_PASS) return alert('관리자 비밀번호 오류');
    setUploading(true);
    const f = e.target;
    const file = f.file_input.files[0];
    const safeName = `${Date.now()}_${file.name}`;
    try {
      const { error: sErr } = await supabase.storage.from('asset-files').upload(safeName, file);
      if (sErr) throw sErr;
      await supabase.from('assets').insert({
        title: f.title.value, price: parseInt(f.price.value),
        description: f.description.value, image_url: f.image.value, file_path: safeName
      });
      sendWebhook(WEBHOOKS.UPLOAD, "📦 상품 등록", `**에셋:** ${f.title.value}\n**가격:** ${f.price.value}원`, 0x9b59b6);
      alert('등록 완료!'); setView('shop'); init();
    } catch (e) { alert(e.message); }
    setUploading(false);
  }

  async function approveCharge(r) {
    if (!confirm('충전을 승인하시겠습니까?')) return;
    const { data: p } = await supabase.from('profiles').select('balance').eq('id', r.user_id).single();
    await supabase.from('profiles').update({ balance: (p.balance || 0) + r.amount }).eq('id', r.user_id);
    await supabase.from('charge_requests').update({ status: 'success' }).eq('id', r.id);
    sendWebhook(WEBHOOKS.CHARGE, "✅ 충전 승인", `**유저:** ${r.user_email}\n**금액:** ${r.amount}원`, 0x00ff88);
    alert('승인 성공'); init();
  }

  if (loading) return <div className="loader">RICE STORE</div>;

  return (
    <div className="main-bg">
      <nav className="navbar">
        <div className="nav-inner">
          <div className="logo" onClick={() => setView('shop')}>
            <img src={LOGO_URL} /> <span>RICE STORE</span>
          </div>
          <div className="nav-right">
            <span className="admin-trigger" onClick={() => setView('admin')}>ADMIN</span>
            {user ? (
              <div className="user-badge">
                <span className="balance">{profile?.balance?.toLocaleString()}원</span>
                <button className="btn-charge" onClick={() => setView('charge')}>충전하기</button>
                {user.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} className="pfp" />}
                <button className="btn-logout" onClick={() => supabase.auth.signOut().then(()=>window.location.reload())}>✕</button>
              </div>
            ) : (
              <button className="btn-discord" onClick={() => supabase.auth.signInWithOAuth({provider:'discord'})}>DISCORD LOGIN</button>
            )}
          </div>
        </div>
      </nav>

      {user && view === 'shop' && myCharges.length > 0 && (
        <div className="status-bar anim-fade">
          <div className="status-inner">
            <strong>STATUS :</strong>
            {myCharges.slice(0, 1).map(c => (
              <span key={c.id} className={c.status}>{c.amount.toLocaleString()}원 충전 {c.status === 'pending' ? '대기중...' : '완료!'}</span>
            ))}
          </div>
        </div>
      )}

      <main className="content-area">
        {view === 'shop' ? (
          <div className="shop-grid anim-up">
            {assets.length > 0 ? assets.map(asset => (
              <div key={asset.id} className="card">
                <div className="card-img"><img src={asset.image_url} /></div>
                <div className="card-body">
                  <span className="sales-tag">판매 {asset.sales_count || 0}</span>
                  <h3>{asset.title}</h3>
                  <div className="card-footer">
                    <span className="price">{asset.price.toLocaleString()}원</span>
                    {purchasedIds.includes(asset.id) ? (
                      <button className="btn-dl" onClick={() => downloadAsset(asset)}>DOWNLOAD</button>
                    ) : (
                      <button className="btn-buy" onClick={() => buyAsset(asset)}>PURCHASE</button>
                    )}
                  </div>
                </div>
              </div>
            )) : <p className="empty-text">상품이 없습니다.</p>}
          </div>
        ) : view === 'charge' ? (
          <div className="form-page anim-up">
            <div className="glass-card shadow-glow">
              <h2>CHARGE WALLET</h2>
              <div className="tabs">
                <button className={chargeType==='voucher'?'active':''} onClick={()=>setChargeType('voucher')}>문상</button>
                <button className={chargeType==='bank'?'active':''} onClick={()=>setChargeType('bank')}>무통장</button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                supabase.from('charge_requests').insert({
                  user_id: user.id, user_email: user.email, amount: parseInt(e.target.amount.value),
                  voucher_pin: e.target.voucher_pin?.value || '', sender_name: e.target.sender_name?.value || '', request_type: chargeType
                }).then(() => {
                  sendWebhook(WEBHOOKS.CHARGE, "💰 충전 신청", `**유저:** ${user.email}\n**금액:** ${e.target.amount.value}원`, 0xf1c40f);
                  alert('신청 완료!'); setView('shop'); init();
                });
              }}>
                <input name="amount" type="number" placeholder="금액 (원)" required />
                {chargeType === 'voucher' ? <input name="voucher_pin" placeholder="PIN 번호 입력" required /> : <input name="sender_name" placeholder="입금자명" required />}
                <button type="submit" className="btn-main-action">신청하기</button>
              </form>
              <button className="btn-text-back" onClick={()=>setView('shop')}>돌아가기</button>
            </div>
          </div>
        ) : (
          <div className="form-page anim-up">
            <div className="glass-card admin-box">
              <h2>ADMINISTRATION</h2>
              <input type="password" placeholder="비밀번호 입력" className="admin-pass" onChange={e => setAdminInput(e.target.value)} />
              {adminInput === ADMIN_PASS && (
                <div className="admin-grid">
                  <div className="admin-sec">
                    <h3>⏳ 충전 대기 목록 ({adminCharges.length})</h3>
                    {adminCharges.map(r => (
                      <div key={r.id} className="admin-item">
                        <div className="info"><strong>{r.amount.toLocaleString()}원</strong><p>{r.user_email}</p><code>{r.voucher_pin || r.sender_name}</code></div>
                        <button onClick={() => approveCharge(r)}>승인</button>
                      </div>
                    ))}
                    {adminCharges.length === 0 && <p style={{color:'#222'}}>대기 없음</p>}
                  </div>
                  <div className="admin-sec">
                    <h3>📦 에셋 등록/삭제</h3>
                    <form onSubmit={handleUpload} className="admin-upload-form">
                      <input name="title" placeholder="상품명" required />
                      <input name="price" type="number" placeholder="가격" required />
                      <input name="image" placeholder="이미지 주소" required />
                      <input name="file_input" type="file" required />
                      <button type="submit" className="btn-up" disabled={uploading}>{uploading ? '...' : '등록'}</button>
                    </form>
                    <div className="inventory-list">
                      {assets.map(a => (
                        <div key={a.id} className="admin-item mini">
                          <span>{a.title}</span> <button onClick={() => deleteAsset(a)} className="btn-del-mini">삭제</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <button className="btn-text-back" onClick={()=>setView('shop')}>나가기</button>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
        body { margin: 0; background: #000; color: #fff; font-family: 'Outfit', sans-serif; overflow-x: hidden; }
        .navbar { background: rgba(5,5,5,0.9); backdrop-filter: blur(20px); border-bottom: 1px solid #111; position: sticky; top:0; z-index:100; }
        .nav-inner { max-width: 1200px; margin: 0 auto; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; }
        .logo { display: flex; align-items: center; gap: 15px; cursor: pointer; font-weight: 900; font-size: 22px; }
        .logo img { width: 35px; height: 35px; border-radius: 8px; }
        .user-badge { display: flex; align-items: center; gap: 15px; background: #0a0a0a; padding: 6px 15px; border-radius: 30px; border: 1px solid #1a1a1a; }
        .balance { font-weight: bold; color: #00d4ff; font-size: 14px; }
        .btn-charge { background: #fff; color: #000; border: none; padding: 6px 15px; border-radius: 12px; font-weight: 900; cursor: pointer; transition: 0.3s; }
        .btn-charge:hover { background: #00d4ff; transform: scale(1.05); }
        .pfp { width: 28px; height: 28px; border-radius: 50%; border: 1px solid #333; }
        .status-bar { background: #080808; border-bottom: 1px solid #111; padding: 10px; font-size: 11px; text-align: center; }
        .status-inner { display: flex; justify-content: center; gap: 20px; }
        .pending { color: #f1c40f; } .success { color: #00ff88; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 40px; padding: 60px 20px; max-width: 1200px; margin: 0 auto; }
        .card { background: #050505; border-radius: 40px; border: 1px solid #111; overflow: hidden; transition: 0.5s; position: relative; }
        .card:hover { transform: translateY(-20px); border-color: #222; box-shadow: 0 40px 80px rgba(0,0,0,0.8); }
        .card-img { height: 220px; overflow: hidden; }
        .card-img img { width: 100%; height: 100%; object-fit: cover; }
        .sales-tag { position: absolute; top: 20px; right: 20px; background: rgba(0,0,0,0.8); padding: 5px 12px; border-radius: 12px; font-size: 11px; font-weight: 900; }
        .card-body { padding: 35px; }
        .price { font-size: 26px; font-weight: 900; }
        .btn-buy { background: #fff; color: #000; border: none; padding: 15px 35px; border-radius: 20px; font-weight: 900; cursor: pointer; transition: 0.3s; }
        .btn-dl { background: #00ff88; color: #000; border: none; padding: 15px 35px; border-radius: 20px; font-weight: 900; cursor: pointer; }
        .btn-discord { background: #5865F2; color: #fff; border: none; padding: 10px 25px; border-radius: 12px; font-weight: 900; cursor: pointer; }
        .form-page { display: flex; justify-content: center; padding: 80px 20px; }
        .glass-card { background: #050505; border: 1px solid #111; padding: 60px; border-radius: 50px; width: 100%; max-width: 500px; }
        .admin-box { max-width: 900px; }
        .admin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; text-align: left; }
        .admin-item { display: flex; justify-content: space-between; align-items: center; background: #000; padding: 20px; border-radius: 20px; border: 1px solid #111; margin-bottom: 15px; }
        .admin-item button { background: #00ff88; color: #000; border: none; padding: 12px 25px; border-radius: 15px; font-weight: 900; cursor: pointer; }
        .btn-del-mini { background: #ff4d4d !important; color: #fff !important; padding: 5px 12px !important; font-size: 11px; }
        .tabs { display: flex; gap: 15px; margin-bottom: 40px; }
        .tabs button { flex: 1; padding: 15px; background: #000; color: #333; border: 1px solid #111; border-radius: 15px; cursor: pointer; font-weight: 900; }
        .tabs button.active { background: #fff; color: #000; }
        input, textarea { width: 100%; padding: 20px; background: #000; border: 1px solid #111; border-radius: 20px; color: #fff; margin-bottom: 15px; box-sizing: border-box; outline: none; }
        .btn-main-action { width: 100%; background: #fff; color: #000; padding: 22px; border-radius: 20px; font-weight: 900; border: none; cursor: pointer; }
        .btn-text-back { background: none; border: none; color: #222; margin-top: 25px; cursor: pointer; width: 100%; font-weight: 900; }
        .loader { height: 100vh; background: #000; display: flex; justify-content: center; align-items: center; font-weight: 900; font-size: 3rem; color: #111; letter-spacing: 15px; }
        .admin-trigger { font-size: 11px; color: #111; cursor: pointer; margin-right: 20px; }
        .anim-up { animation: fadeInUp 0.8s ease-out; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
