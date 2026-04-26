'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RiceStoreFinal() {
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

  // --- 데이터를 각각 안전하게 가져오는 함수 ---
  async function init() {
    setLoading(true);
    // 1. 유저 정보 체크
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      setUser(u);
      // 프로필 & 구매내역 & 내 충전 내역 (로그인 시에만)
      supabase.from('profiles').select('*').eq('id', u.id).single().then(({data}) => setProfile(data || { balance: 0 }));
      supabase.from('purchases').select('asset_id').eq('user_id', u.id).then(({data}) => setPurchasedIds(data?.map(i => i.asset_id) || []));
      supabase.from('charge_requests').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(3).then(({data}) => setMyCharges(data || []));
    }
    
    // 2. 공통 데이터 (항상 로드)
    supabase.from('assets').select('*').order('id', { ascending: false }).then(({data}) => setAssets(data || []));
    
    // 3. 관리자용 충전 대기 목록 (항상 로드하되 에러 무시)
    supabase.from('charge_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false }).then(({data}) => setAdminCharges(data || []));

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
      sendWebhook(WEBHOOKS.BUY, "🛍️ 구매 완료", `**구매자:** ${user?.email}\n**상품:** ${asset.title}\n**금액:** ${asset.price}원`, 0x3498db);
      alert('🎉 구매 성공! 다운로드 버튼을 클릭하세요.'); init();
    }
  }

  async function downloadAsset(asset) {
    if (!asset.file_path) return alert('파일이 없습니다.');
    const { data } = await supabase.storage.from('asset-files').createSignedUrl(asset.file_path, 60);
    if (data) window.location.href = data.signedUrl;
  }

  async function handleUploadAsset(e) {
    e.preventDefault();
    if (adminInput !== ADMIN_PASS) return alert('비번 틀림');
    setUploading(true);
    const form = e.target;
    const file = form.file_input.files[0];
    const fileExt = file.name.split('.').pop();
    const safeName = `${Date.now()}.${fileExt}`;
    try {
      await supabase.storage.from('asset-files').upload(safeName, file);
      await supabase.from('assets').insert({
        title: form.title.value, price: parseInt(form.price.value),
        description: form.description.value, image_url: form.image.value, file_path: safeName, sales_count: 0
      });
      sendWebhook(WEBHOOKS.UPLOAD, "📦 상품 등록", `**이름:** ${form.title.value}\n**가격:** ${form.price.value}원`, 0x9b59b6);
      alert('등록 완료!'); setView('shop'); init();
    } catch (err) { alert(err.message); }
    setUploading(false);
  }

  async function approveCharge(req) {
    if (!confirm(`${req.user_email}님의 충전을 승인할까요?`)) return;
    const { data: p } = await supabase.from('profiles').select('balance').eq('id', req.user_id).single();
    await supabase.from('profiles').update({ balance: (p.balance || 0) + req.amount }).eq('id', req.user_id);
    await supabase.from('charge_requests').update({ status: 'success' }).eq('id', req.id);
    sendWebhook(WEBHOOKS.CHARGE, "✅ 충전 완료", `**유저:** ${req.user_email}\n**금액:** ${req.amount}원`, 0x00ff88);
    alert('승인 성공!'); init();
  }

  async function deleteAsset(asset) {
    if (!confirm('정말 삭제할까요?')) return;
    await supabase.from('assets').delete().eq('id', asset.id);
    if (asset.file_path) await supabase.storage.from('asset-files').remove([asset.file_path]);
    alert('삭제 완료'); init();
  }

  if (loading) return <div className="loader">RICE STORE...</div>;

  if (!user) return (
    <div className="gate">
      <div className="gate-card anim-slide-in">
        <img src={LOGO_URL} className="gate-logo anim-pulse" />
        <h1 className="neon-text">RICE STORE</h1>
        <button onClick={() => supabase.auth.signInWithOAuth({provider:'discord', options:{redirectTo:window.location.origin}})} className="discord-btn">DISCORD LOGIN</button>
      </div>
      <style jsx>{`
        .gate { height: 100vh; background: #000; display: flex; justify-content: center; align-items: center; }
        .gate-card { background: #0a0a0a; padding: 70px; border-radius: 50px; text-align: center; border: 1px solid #1a1a1a; color: #fff; }
        .gate-logo { width: 140px; border-radius: 30px; margin-bottom: 20px; }
        .discord-btn { background: #fff; color: #000; padding: 18px 40px; border-radius: 15px; font-weight: 900; cursor: pointer; border: none; }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .anim-pulse { animation: pulse 3s infinite; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .anim-slide-in { animation: slideIn 1s ease-out; }
        .neon-text { font-size: 3rem; font-weight: 900; letter-spacing: -2px; }
      `}</style>
    </div>
  );

  return (
    <div className="container">
      <nav className="nav">
        <div className="nav-inner">
          <div className="logo" onClick={() => setView('shop')}>
            <img src={LOGO_URL} className="nav-logo" />
            <span>RICE STORE</span>
          </div>
          <div className="nav-right">
            <span className="admin-btn" onClick={() => setView('admin')}>ADMIN</span>
            <div className="user-card">
              <span className="balance">{profile?.balance?.toLocaleString()}원</span>
              <button className="charge-nav-btn" onClick={() => setView('charge')}>충전</button>
              {user?.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} className="avatar" />}
              <button className="logout-btn" onClick={() => supabase.auth.signOut().then(()=>window.location.reload())}>✕</button>
            </div>
          </div>
        </div>
      </nav>

      {myCharges.length > 0 && view === 'shop' && (
        <div className="status-bar anim-slide-down">
          {myCharges.map(c => (
            <div key={c.id} className={`status-item ${c.status}`}>
              🔔 {c.amount.toLocaleString()}원 충전 - {c.status === 'pending' ? '대기 중' : '완료'}
            </div>
          ))}
        </div>
      )}

      <main className="content">
        {view === 'shop' ? (
          <div className="grid anim-fade-in">
            {assets.map(asset => (
              <div key={asset.id} className="card">
                <img src={asset.image_url} className="card-img" />
                <div className="card-body">
                  <h3>{asset.title}</h3>
                  <div className="card-footer">
                    <span className="price">{asset.price.toLocaleString()}원</span>
                    {purchasedIds.includes(asset.id) ? (
                      <button onClick={() => downloadAsset(asset)} className="btn-dl">DOWNLOAD</button>
                    ) : (
                      <button onClick={() => buyAsset(asset)} className="btn-buy">PURCHASE</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : view === 'charge' ? (
          <div className="form-view anim-fade-in">
            <div className="glass-card">
              <h2>포인트 충전</h2>
              <div className="tabs">
                <button className={chargeType==='voucher'?'active':''} onClick={()=>setChargeType('voucher')}>문상</button>
                <button className={chargeType==='bank'?'active':''} onClick={()=>setChargeType('bank')}>무통장</button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const amount = e.target.amount.value;
                const pin = e.target.voucher_pin?.value || '';
                const name = e.target.sender_name?.value || '';
                supabase.from('charge_requests').insert({
                  user_id: user.id, user_email: user.email, amount: parseInt(amount),
                  voucher_pin: pin, sender_name: name, request_type: chargeType
                }).then(() => {
                  sendWebhook(WEBHOOKS.CHARGE, "💰 충전 신청", `**유저:** ${user.email}\n**금액:** ${amount}원\n**정보:** ${pin || name}`, 0xf1c40f);
                  alert('신청 완료!'); setView('shop'); init();
                });
              }}>
                <input name="amount" type="number" placeholder="금액" required />
                {chargeType === 'voucher' ? <input name="voucher_pin" placeholder="PIN 번호" required /> : <input name="sender_name" placeholder="입금자명" required />}
                <button type="submit" className="submit-btn">신청하기</button>
              </form>
              <button className="back-btn" onClick={() => setView('shop')}>BACK</button>
            </div>
          </div>
        ) : (
          <div className="form-view anim-fade-in">
            <div className="glass-card" style={{maxWidth:'800px'}}>
              <h2>ADMIN PANEL</h2>
              <input type="password" placeholder="ADMIN CODE" onChange={e => setAdminInput(e.target.value)} />
              {adminInput === ADMIN_PASS && (
                <div style={{marginTop:'30px'}}>
                  {/* 대기 목록 ⭐ 가장 먼저 보이게 배치 */}
                  <h3 style={{color:'#8ec5fc'}}>⏳ 충전 승인 대기 목록</h3>
                  {adminCharges.length > 0 ? adminCharges.map(r => (
                    <div key={r.id} className="admin-list-item">
                      <div>
                        <strong>{r.amount.toLocaleString()}원 ({r.request_type})</strong>
                        <p>{r.user_email}</p>
                        <code>{r.voucher_pin || r.sender_name}</code>
                      </div>
                      <button onClick={() => approveCharge(r)}>승인하기</button>
                    </div>
                  )) : <p style={{color:'#333', textAlign:'center'}}>대기 중인 신청이 없습니다.</p>}
                  
                  <hr style={{margin:'40px 0', borderColor:'#222'}} />
                  
                  <h3>📦 상품 등록</h3>
                  <form onSubmit={handleUploadAsset} className="admin-form">
                    <input name="title" placeholder="상품명" required />
                    <input name="price" type="number" placeholder="가격" required />
                    <textarea name="description" placeholder="설명" required />
                    <input name="image" placeholder="이미지 URL" required />
                    <input name="file_input" type="file" required style={{border:'none'}} />
                    <button type="submit" className="submit-btn" disabled={uploading}>{uploading ? '업로드 중...' : '상품 등록'}</button>
                  </form>

                  <hr style={{margin:'40px 0', borderColor:'#222'}} />
                  
                  <h3>🗑️ 상품 삭제 관리</h3>
                  {assets.map(a => (
                    <div key={a.id} className="admin-list-item">
                      <span>{a.title}</span>
                      <button onClick={() => deleteAsset(a)} style={{background:'#ff4d4d'}}>삭제</button>
                    </div>
                  ))}
                </div>
              )}
              <button className="back-btn" onClick={() => setView('shop')}>EXIT</button>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        body { margin: 0; background: #000; color: #fff; font-family: sans-serif; }
        .nav { background: #050505; border-bottom: 1px solid #111; position: sticky; top: 0; z-index: 100; }
        .nav-inner { max-width: 1200px; margin: 0 auto; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; }
        .logo { display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 900; }
        .nav-logo { width: 35px; height: 35px; border-radius: 8px; }
        .user-card { display: flex; align-items: center; gap: 15px; background: #0a0a0a; padding: 5px 15px; border-radius: 30px; border: 1px solid #1a1a1a; }
        .balance { font-weight: bold; color: #8ec5fc; }
        .charge-nav-btn { background: #fff; color: #000; border: none; padding: 4px 12px; border-radius: 8px; font-weight: 900; cursor: pointer; font-size: 11px; }
        .avatar { width: 28px; height: 28px; border-radius: 50%; }
        .logout-btn { background: none; border: none; color: #333; cursor: pointer; font-size: 18px; }
        .status-bar { background: #0a0a0a; padding: 12px; border-bottom: 1px solid #111; display: flex; justify-content: center; gap: 20px; font-size: 12px; }
        .pending { color: #f1c40f; }
        .success { color: #00ff88; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 35px; padding: 40px 20px; max-width: 1200px; margin: 0 auto; }
        .card { background: #080808; border-radius: 30px; border: 1px solid #1a1a1a; overflow: hidden; transition: 0.4s; }
        .card:hover { transform: translateY(-10px); border-color: #333; }
        .card-img { width: 100%; height: 200px; object-fit: cover; }
        .card-body { padding: 25px; }
        .btn-buy, .btn-dl { background: #fff; color: #000; border: none; padding: 12px 25px; border-radius: 12px; font-weight: bold; cursor: pointer; }
        .form-view { display: flex; justify-content: center; padding: 60px 20px; }
        .glass-card { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 50px; border-radius: 40px; width: 100%; }
        .tabs { display: flex; gap: 10px; margin-bottom: 30px; }
        .tabs button { flex: 1; padding: 15px; background: #000; color: #444; border: 1px solid #222; border-radius: 15px; cursor: pointer; }
        .tabs button.active { background: #fff; color: #000; }
        input, textarea { width: 100%; padding: 15px; background: #000; border: 1px solid #1a1a1a; border-radius: 15px; color: #fff; margin-bottom: 15px; box-sizing: border-box; outline: none; }
        .submit-btn { width: 100%; background: #fff; color: #000; padding: 15px; border-radius: 12px; font-weight: 900; cursor: pointer; }
        .admin-list-item { display: flex; justify-content: space-between; align-items: center; background: #000; padding: 20px; border-radius: 20px; border: 1px solid #111; margin-bottom: 10px; }
        .admin-list-item button { background: #00ff88; color: #000; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 900; cursor: pointer; }
        .admin-form { display: flex; flex-direction: column; }
        .anim-fade-in { animation: fadeIn 1s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .loader { height: 100vh; background: #000; display: flex; justify-content: center; align-items: center; font-weight: 900; color: #222; }
        .admin-btn { font-size: 10px; color: #111; cursor: pointer; }
      `}</style>
    </div>
  );
}
