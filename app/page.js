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

  // --- 데이터 강제 새로고침 함수 ---
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

  // --- 구매 기능 ---
  async function buyAsset(asset) {
    if (!profile || profile.balance < asset.price) return alert('잔액이 부족합니다.');
    const { error } = await supabase.from('profiles').update({ balance: profile.balance - asset.price }).eq('id', user.id);
    if (!error) {
      await supabase.from('purchases').insert({ user_id: user.id, asset_id: asset.id });
      await supabase.from('assets').update({ sales_count: (asset.sales_count || 0) + 1 }).eq('id', asset.id);
      sendWebhook(WEBHOOKS.BUY, "🛍️ 구매 발생", `**유저:** ${user.email}\n**아이템:** ${asset.title}\n**금액:** ${asset.price}원`, 0x00d4ff);
      alert('구매 완료!'); init();
    }
  }

  // --- 다운로드 기능 ---
  async function downloadAsset(asset) {
    const { data } = await supabase.storage.from('asset-files').createSignedUrl(asset.file_path, 60);
    if (data?.signedUrl) {
      const a = document.createElement('a'); a.href = data.signedUrl; a.download = `${asset.title}.rbxm`; a.click();
    }
  }

  // --- 삭제 기능 (연관 데이터까지 삭제하도록 강화) ---
  async function deleteAsset(asset) {
    if (!confirm(`[${asset.title}] 에셋을 영구 삭제할까요? 구매 내역도 함께 사라집니다.`)) return;
    try {
      // 1. 연관된 구매 기록부터 삭제 (이걸 안하면 DB 오류남)
      await supabase.from('purchases').delete().eq('asset_id', asset.id);
      // 2. 에셋 정보 삭제
      await supabase.from('assets').delete().eq('id', asset.id);
      // 3. 스토리지 파일 삭제
      if (asset.file_path) await supabase.storage.from('asset-files').remove([asset.file_path]);
      alert('완전 삭제 성공'); init();
    } catch (e) { alert('삭제 실패: ' + e.message); }
  }

  // --- 업로드 기능 ---
  async function handleUpload(e) {
    e.preventDefault();
    if (adminInput !== ADMIN_PASS) return alert('비번 틀림');
    setUploading(true);
    const f = e.target;
    const file = f.file_input.files[0];
    const safeName = `${Date.now()}_${file.name}`;
    try {
      await supabase.storage.from('asset-files').upload(safeName, file);
      await supabase.from('assets').insert({
        title: f.title.value, price: parseInt(f.price.value),
        description: f.description.value, image_url: f.image.value, file_path: safeName
      });
      sendWebhook(WEBHOOKS.UPLOAD, "📦 새 에셋 등록", `**에셋명:** ${f.title.value}`, 0x9b59b6);
      alert('등록 성공!'); setView('shop'); init();
    } catch (e) { alert(e.message); }
    setUploading(false);
  }

  // --- 충전 승인 기능 ---
  async function handleApprove(r) {
    const { data: p } = await supabase.from('profiles').select('balance').eq('id', r.user_id).single();
    await supabase.from('profiles').update({ balance: (p.balance || 0) + r.amount }).eq('id', r.user_id);
    await supabase.from('charge_requests').update({ status: 'success' }).eq('id', r.id);
    sendWebhook(WEBHOOKS.CHARGE, "✅ 충전 승인", `**유저:** ${r.user_email}\n**금액:** ${r.amount}원`, 0x00ff88);
    alert('승인 완료'); init();
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
                <img src={user.user_metadata?.avatar_url} className="pfp" />
                <button className="btn-logout" onClick={() => supabase.auth.signOut().then(()=>window.location.reload())}>✕</button>
              </div>
            ) : (
              <button className="btn-discord" onClick={() => supabase.auth.signInWithOAuth({provider:'discord'})}>DISCORD LOGIN</button>
            )}
          </div>
        </div>
      </nav>

      {user && view === 'shop' && myCharges.length > 0 && (
        <div className="status-bar">
          <div className="status-inner">
            <strong>MY STATUS :</strong>
            {myCharges.slice(0, 2).map(c => (
              <span key={c.id} className={c.status}>{c.amount}원 {c.status === 'pending' ? '대기중' : '완료'}</span>
            ))}
          </div>
        </div>
      )}

      <main className="container">
        {view === 'shop' ? (
          <div className="shop-layout">
            <div className="grid">
              {assets.map(asset => (
                <div key={asset.id} className="card">
                  <div className="card-img"><img src={asset.image_url} /></div>
                  <div className="card-body">
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
              ))}
            </div>
          </div>
        ) : view === 'charge' ? (
          <div className="form-page">
            <div className="glass-card">
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
                <input name="amount" type="number" placeholder="금액" required />
                {chargeType === 'voucher' ? <input name="voucher_pin" placeholder="PIN" required /> : <input name="sender_name" placeholder="입금자" required />}
                <button type="submit" className="btn-main">충전 신청하기</button>
              </form>
              <button className="btn-back" onClick={()=>setView('shop')}>BACK</button>
            </div>
          </div>
        ) : (
          <div className="form-page">
            <div className="glass-card admin-dashboard">
              <h2>ADMIN DASHBOARD</h2>
              <input type="password" placeholder="ADMIN PASS" onChange={e => setAdminInput(e.target.value)} />
              {adminInput === ADMIN_PASS && (
                <div className="admin-grid">
                  <div className="admin-sec">
                    <h3>⏳ 대기 목록 ({adminCharges.length})</h3>
                    {adminCharges.map(r => (
                      <div key={r.id} className="admin-item">
                        <div className="info"><strong>{r.amount}원</strong><p>{r.user_email}</p></div>
                        <button onClick={() => handleApprove(r)}>승인</button>
                      </div>
                    ))}
                  </div>
                  <div className="admin-sec">
                    <h3>📦 에셋 관리</h3>
                    <form onSubmit={handleUpload} className="admin-form">
                      <input name="title" placeholder="상품명" required />
                      <input name="price" type="number" placeholder="가격" required />
                      <input name="image" placeholder="이미지 URL" required />
                      <input name="file_input" type="file" required />
                      <button type="submit" disabled={uploading}>등록</button>
                    </form>
                    <div className="inventory-list">
                      {assets.map(a => (
                        <div key={a.id} className="admin-item mini">
                          <span>{a.title}</span> <button onClick={() => deleteAsset(a)}>삭제</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <button className="btn-back" onClick={()=>setView('shop')}>EXIT</button>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        body { margin: 0; background: #000; color: #fff; font-family: 'Inter', sans-serif; overflow-x: hidden; }
        .navbar { background: rgba(10,10,10,0.8); backdrop-filter: blur(20px); border-bottom: 1px solid #111; position: sticky; top: 0; z-index: 100; }
        .nav-inner { max-width: 1200px; margin: 0 auto; padding: 20px; display: flex; justify-content: space-between; align-items: center; }
        .logo { display: flex; align-items: center; gap: 15px; cursor: pointer; font-weight: 900; font-size: 24px; }
        .logo img { width: 40px; height: 40px; border-radius: 10px; }
        .user-badge { display: flex; align-items: center; gap: 15px; background: #080808; padding: 8px 15px; border-radius: 30px; border: 1px solid #222; }
        .balance { font-weight: bold; color: #00d4ff; }
        .btn-charge { background: #fff; color: #000; border: none; padding: 5px 12px; border-radius: 10px; font-weight: 900; cursor: pointer; }
        .pfp { width: 30px; height: 30px; border-radius: 50%; }
        .status-bar { background: #050505; border-bottom: 1px solid #111; padding: 10px; font-size: 11px; text-align: center; }
        .status-inner { display: flex; justify-content: center; gap: 20px; }
        .pending { color: #f1c40f; } .success { color: #00ff88; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 40px; padding: 60px 20px; max-width: 1200px; margin: 0 auto; }
        .card { background: #050505; border-radius: 30px; border: 1px solid #111; overflow: hidden; transition: 0.4s; }
        .card:hover { transform: translateY(-15px); border-color: #222; box-shadow: 0 30px 60px rgba(0,0,0,0.8); }
        .card-img { height: 200px; overflow: hidden; }
        .card-img img { width: 100%; height: 100%; object-fit: cover; }
        .card-body { padding: 30px; }
        .price { font-size: 24px; font-weight: 900; color: #fff; }
        .btn-buy { background: #fff; color: #000; border: none; padding: 12px 25px; border-radius: 12px; font-weight: 900; cursor: pointer; }
        .btn-dl { background: #00ff88; color: #000; border: none; padding: 12px 25px; border-radius: 12px; font-weight: 900; cursor: pointer; }
        .form-page { display: flex; justify-content: center; padding: 80px 20px; }
        .glass-card { background: #050505; border: 1px solid #111; padding: 50px; border-radius: 40px; width: 100%; max-width: 500px; }
        .admin-dashboard { max-width: 900px; }
        .admin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; text-align: left; }
        .admin-item { display: flex; justify-content: space-between; align-items: center; background: #000; padding: 15px; border-radius: 15px; border: 1px solid #111; margin-bottom: 10px; }
        .admin-item button { background: #00ff88; color: #000; border: none; padding: 8px 15px; border-radius: 10px; font-weight: 900; cursor: pointer; }
        .admin-item.mini button { background: #ff4d4d; color: #fff; padding: 5px 10px; font-size: 11px; }
        .tabs { display: flex; gap: 10px; margin-bottom: 30px; }
        .tabs button { flex: 1; padding: 12px; background: #000; color: #333; border: 1px solid #111; border-radius: 12px; cursor: pointer; font-weight: 900; }
        .tabs button.active { background: #fff; color: #000; }
        input, textarea { width: 100%; padding: 15px; background: #000; border: 1px solid #111; border-radius: 15px; color: #fff; margin-bottom: 10px; box-sizing: border-box; outline: none; }
        .btn-main { width: 100%; background: #fff; color: #000; padding: 15px; border-radius: 15px; font-weight: 900; border: none; cursor: pointer; }
        .btn-back { background: none; border: none; color: #222; margin-top: 20px; cursor: pointer; width: 100%; font-weight: 900; }
        .loader { height: 100vh; display: flex; justify-content: center; align-items: center; font-weight: 900; font-size: 2rem; color: #111; letter-spacing: 10px; }
        .admin-trigger { font-size: 10px; color: #111; cursor: pointer; margin-right: 20px; }
      `}</style>
    </div>
  );
}
