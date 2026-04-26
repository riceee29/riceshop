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
    if (!profile || profile.balance < asset.price) return alert('은하수 잔액이 부족합니다.');
    const { error } = await supabase.from('profiles').update({ balance: profile.balance - asset.price }).eq('id', user.id);
    if (!error) {
      await supabase.from('purchases').insert({ user_id: user.id, asset_id: asset.id });
      await supabase.from('assets').update({ sales_count: (asset.sales_count || 0) + 1 }).eq('id', asset.id);
      sendWebhook(WEBHOOKS.BUY, "🛍️ 구매 완료", `**유저:** ${user.email}\n**상품:** ${asset.title}`, 0x3498db);
      alert('🎉 구매 완료!'); init();
    }
  }

  // --- [수정] 한글 에러 해결용 다운로드 함수 ---
  async function downloadAsset(asset) {
    if (!asset.file_path) return alert('파일이 없습니다.');
    try {
      // 정확한 파일 경로로 비밀 주소 생성
      const { data, error } = await supabase.storage
        .from('asset-files')
        .createSignedUrl(asset.file_path, 60);
      
      if (error) throw error;
      
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = `${asset.title}.rbxm`; // 유저가 받을 땐 상품 이름으로
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) { alert('다운로드 실패 (파일을 다시 업로드해보세요): ' + e.message); }
  }

  // --- [수정] 한글 에러 해결용 업로드 함수 (이름 강제 변환) ---
  async function handleUpload(e) {
    e.preventDefault();
    if (adminInput !== ADMIN_PASS) return alert('비번 틀림');
    setUploading(true);
    const f = e.target;
    const file = f.file_input.files[0];
    
    // 파일 확장자만 추출하고 이름은 숫자로 강제 변환 (한글 에러 원천 차단)
    const fileExt = file.name.split('.').pop();
    const safeName = `${Date.now()}.${fileExt}`; 

    try {
      const { error: sErr } = await supabase.storage.from('asset-files').upload(safeName, file);
      if (sErr) throw sErr;
      await supabase.from('assets').insert({
        title: f.title.value, price: parseInt(f.price.value),
        description: f.description.value, image_url: f.image.value, file_path: safeName
      });
      sendWebhook(WEBHOOKS.UPLOAD, "📦 상품 등록", `**에셋:** ${f.title.value}`, 0x9b59b6);
      alert('등록 성공!'); setView('shop'); init();
    } catch (err) { alert(err.message); }
    setUploading(false);
  }

  async function deleteAsset(asset) {
    if (!confirm(`[${asset.title}] 정말 삭제할까요?`)) return;
    try {
      await supabase.from('purchases').delete().eq('asset_id', asset.id);
      await supabase.from('assets').delete().eq('id', asset.id);
      if (asset.file_path) await supabase.storage.from('asset-files').remove([asset.file_path]);
      alert('삭제 성공'); init();
    } catch (e) { alert(e.message); }
  }

  async function approveCharge(r) {
    if (!confirm('승인하시겠습니까?')) return;
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
          <div className="logo" onClick={() => setView('shop')}><img src={LOGO_URL} /> <span>RICE STORE</span></div>
          <div className="nav-right">
            <span className="admin-trigger" onClick={() => setView('admin')}>ADMIN</span>
            {user ? (
              <div className="user-badge">
                <div className="wallet"><small>WALLET</small><strong>{profile?.balance?.toLocaleString()}원</strong></div>
                <button className="btn-charge" onClick={() => setView('charge')}>충전하기</button>
                <img src={user.user_metadata?.avatar_url} className="pfp" />
                <button className="btn-logout" onClick={() => supabase.auth.signOut().then(()=>window.location.reload())}>✕</button>
              </div>
            ) : (
              <button className="btn-discord" onClick={() => supabase.auth.signInWithOAuth({provider:'discord'})}>LOGIN</button>
            )}
          </div>
        </div>
      </nav>

      {user && view === 'shop' && myCharges.length > 0 && (
        <div className="status-bar">
          <strong>MY STATUS :</strong>
          {myCharges.slice(0, 1).map(c => (
            <span key={c.id} className={c.status}>{c.amount.toLocaleString()}원 충전 {c.status === 'pending' ? '대기 중...' : '완료!'}</span>
          ))}
        </div>
      )}

      <main className="container">
        {view === 'shop' ? (
          <div className="shop-grid">
            <div className="grid">
              {assets.map(asset => (
                <div key={asset.id} className="card">
                  <div className="card-top"><img src={asset.image_url} alt="asset" /><span className="sales-badge">구매 {asset.sales_count || 0}</span></div>
                  <div className="card-body">
                    <h3>{asset.title}</h3>
                    <p>{asset.description}</p>
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
          <div className="form-page"><div className="glass-card shadow-glow">
            <h2>CHARGE</h2>
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
              {chargeType === 'voucher' ? <input name="voucher_pin" placeholder="PIN" required /> : <input name="sender_name" placeholder="입금자명" required />}
              <button type="submit" className="btn-main">신청하기</button>
            </form>
            <button className="btn-back" onClick={()=>setView('shop')}>돌아가기</button>
          </div></div>
        ) : (
          <div className="form-page"><div className="glass-card admin-box">
            <h2>ADMINISTRATION</h2>
            <input type="password" placeholder="PASSWORD" className="admin-pw" onChange={e => setAdminInput(e.target.value)} />
            {adminInput === ADMIN_PASS && (
              <div className="admin-grid">
                <div className="admin-sec">
                  <h3 style={{color: '#8ec5fc'}}>⏳ 충전 승인 대기 ({adminCharges.length})</h3>
                  <div className="scroll-box">
                    {adminCharges.map(r => (
                      <div key={r.id} className="admin-list-item">
                        <div className="info"><strong>{r.amount.toLocaleString()}원</strong><p>{r.user_email}</p><code>{r.voucher_pin || r.sender_name}</code></div>
                        <button onClick={() => approveCharge(r)}>승인</button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="admin-sec">
                  <h3 style={{color: '#8ec5fc'}}>📦 에셋 관리</h3>
                  <form onSubmit={handleUpload} className="upload-form">
                    <input name="title" placeholder="상품명" required />
                    <input name="price" type="number" placeholder="가격" required />
                    <textarea name="description" placeholder="상세 설명" required />
                    <input name="image" placeholder="이미지 URL" required />
                    <input name="file_input" type="file" required style={{border:'none', fontSize:'12px'}} />
                    <button type="submit" className="btn-main" disabled={uploading}>{uploading ? '...' : '에셋 등록'}</button>
                  </form>
                  <div className="scroll-box" style={{marginTop:'20px'}}>
                    {assets.map(a => (
                      <div key={a.id} className="admin-list-item">
                        <span style={{fontSize:'12px'}}>{a.title}</span> <button onClick={() => deleteAsset(a)} style={{background:'#ff4d4d', fontSize:'11px', padding:'5px 10px'}}>삭제</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <button className="btn-back" onClick={()=>setView('shop')}>EXIT</button>
          </div></div>
        )}
      </main>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
        body { margin: 0; background: #000; color: #fff; font-family: 'Outfit', sans-serif; overflow-x: hidden; }
        .navbar { background: rgba(5,5,5,0.9); backdrop-filter: blur(25px); border-bottom: 1px solid #111; position: sticky; top:0; z-index:1000; }
        .nav-inner { max-width: 1200px; margin: 0 auto; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; }
        .logo { display: flex; align-items: center; gap: 15px; cursor: pointer; font-weight: 900; font-size: 24px; }
        .logo img { width: 40px; height: 40px; border-radius: 10px; }
        .user-badge { display: flex; align-items: center; gap: 15px; background: #0a0a0a; padding: 5px 15px; border-radius: 30px; border: 1px solid #1a1a1a; }
        .wallet { display: flex; flex-direction: column; text-align: right; line-height: 1; }
        .wallet small { font-size: 8px; color: #444; font-weight: 900; }
        .wallet strong { font-size: 14px; color: #8ec5fc; }
        .btn-charge { background: #fff; color: #000; border: none; padding: 6px 12px; border-radius: 10px; font-weight: 900; cursor: pointer; }
        .pfp { width: 28px; height: 28px; border-radius: 50%; }
        .status-bar { background: #080808; border-bottom: 1px solid #111; padding: 10px; text-align: center; font-size: 11px; }
        .pending { color: #f1c40f; } .success { color: #00ff88; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 30px; padding: 60px 20px; max-width: 1200px; margin: 0 auto; }
        .card { background: #0a0a0a; border-radius: 35px; border: 1px solid #151515; overflow: hidden; transition: 0.5s; position: relative; }
        .card:hover { transform: translateY(-15px); border-color: #333; box-shadow: 0 40px 80px rgba(0,0,0,0.8); }
        .card-top { height: 200px; position: relative; }
        .card-top img { width: 100%; height: 100%; object-fit: cover; }
        .sales-badge { position: absolute; top: 15px; right: 15px; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); padding: 8px 15px; border-radius: 10px; font-size: 11px; font-weight: 900; }
        .card-body { padding: 30px; }
        .price { font-size: 24px; font-weight: 900; }
        .btn-buy { background: #fff; color: #000; border: none; padding: 12px 25px; border-radius: 15px; font-weight: 900; cursor: pointer; }
        .btn-dl { background: #00ff88; color: #000; border: none; padding: 12px 25px; border-radius: 15px; font-weight: 900; cursor: pointer; }
        .btn-discord { background: #5865F2; color: #fff; border: none; padding: 10px 20px; border-radius: 10px; font-weight: bold; cursor: pointer; }
        .glass-card { background: #050505; border: 1px solid #111; padding: 50px; border-radius: 40px; width: 100%; max-width: 500px; }
        .admin-box { max-width: 900px; }
        .admin-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 30px; margin-top: 30px; text-align: left; }
        .admin-list-item { display: flex; justify-content: space-between; align-items: center; background: #000; padding: 15px; border-radius: 20px; border: 1px solid #111; margin-bottom: 10px; }
        .admin-list-item button { background: #00ff88; color: #000; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 900; cursor: pointer; }
        .scroll-box { max-height: 400px; overflow-y: auto; padding-right: 10px; }
        .tabs { display: flex; gap: 10px; margin-bottom: 30px; }
        .tabs button { flex: 1; padding: 15px; background: #000; color: #333; border: 1px solid #111; border-radius: 15px; cursor: pointer; font-weight: 900; }
        .tabs button.active { background: #fff; color: #000; font-weight: 900; }
        input, textarea { width: 100%; padding: 18px; background: #000; border: 1px solid #111; border-radius: 15px; color: #fff; margin-bottom: 15px; box-sizing: border-box; outline: none; }
        .btn-main { width: 100%; background: #fff; color: #000; padding: 20px; border-radius: 15px; font-weight: 900; cursor: pointer; border: none; }
        .loader { height: 100vh; background: #000; display: flex; justify-content: center; align-items: center; font-weight: 900; font-size: 2rem; color: #111; }
        .admin-trigger { font-size: 10px; color: #111; cursor: pointer; margin-right: 20px; }
      `}</style>
    </div>
  );
}
