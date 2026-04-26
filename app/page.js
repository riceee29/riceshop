'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RiceStoreUltimate() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assets, setAssets] = useState([]);
  const [reviews, setReviews] = useState([]);
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
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        setUser(u);
        const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single();
        setProfile(p || { balance: 0 });
        const { data: pur } = await supabase.from('purchases').select('asset_id').eq('user_id', u.id);
        setPurchasedIds(pur?.map(item => item.asset_id) || []);
        const { data: char } = await supabase.from('charge_requests').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(3);
        setMyCharges(char || []);
      }
      
      const { data: assetsData } = await supabase.from('assets').select('*').order('id', { ascending: false });
      setAssets(assetsData || []);
      const { data: revData } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
      setReviews(revData || []);
      
      // 관리자용 대기 목록 강제 로드
      const { data: allChar } = await supabase.from('charge_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false });
      setAdminCharges(allChar || []);

    } catch (e) { console.error("데이터 로드 실패:", e); }
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
    const { error: pErr } = await supabase.from('profiles').update({ balance: profile.balance - asset.price }).eq('id', user.id);
    if (!pErr) {
      await supabase.from('purchases').insert({ user_id: user.id, asset_id: asset.id });
      await supabase.from('assets').update({ sales_count: (asset.sales_count || 0) + 1 }).eq('id', asset.id);
      sendWebhook(WEBHOOKS.BUY, "🛍️ 구매 완료", `**구매자:** ${user?.email}\n**상품:** ${asset.title}\n**금액:** ${asset.price}원`, 0x3498db);
      alert('🎉 구매 완료! DOWNLOAD 버튼이 활성화되었습니다.'); init();
    }
  }

  async function downloadAsset(asset) {
    if (!asset.file_path) return alert('파일이 없습니다.');
    const { data } = await supabase.storage.from('asset-files').createSignedUrl(asset.file_path, 60);
    if (data) window.location.href = data.signedUrl;
  }

  async function handleUploadAsset(e) {
    e.preventDefault();
    if (adminInput !== ADMIN_PASS) return alert('비밀번호 오류');
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
      sendWebhook(WEBHOOKS.UPLOAD, "📦 상품 등록 완료", `**에셋:** ${form.title.value}\n**가격:** ${form.price.value}원`, 0x9b59b6);
      alert('등록 성공!'); init();
    } catch (err) { alert(err.message); }
    setUploading(false);
  }

  async function approveCharge(req) {
    if (!confirm('충전을 승인할까요?')) return;
    const { data: p } = await supabase.from('profiles').select('balance').eq('id', req.user_id).single();
    await supabase.from('profiles').update({ balance: (p.balance || 0) + req.amount }).eq('id', req.user_id);
    await supabase.from('charge_requests').update({ status: 'success' }).eq('id', req.id);
    sendWebhook(WEBHOOKS.CHARGE, "✅ 충전 승인 완료", `**유저:** ${req.user_email}\n**금액:** ${req.amount}원`, 0x00ff88);
    alert('승인 완료!'); init();
  }

  async function deleteAsset(asset) {
    if (!confirm('정말 삭제할까요? 데이터가 영구 삭제됩니다.')) return;
    await supabase.from('assets').delete().eq('id', asset.id);
    if (asset.file_path) await supabase.storage.from('asset-files').remove([asset.file_path]);
    alert('삭제 완료'); init();
  }

  if (loading) return <div className="loader"><span>RICE STORE</span></div>;

  return (
    <div className="app-container">
      {/* 네비게이션 */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="logo-section" onClick={() => setView('shop')}>
            <img src={LOGO_URL} className="logo-img" alt="logo" />
            <span className="logo-text">RICE STORE</span>
          </div>
          <div className="nav-right">
            <span className="admin-btn" onClick={() => setView('admin')}>ADMIN</span>
            {user ? (
              <div className="user-card">
                <div className="balance-info">
                  <span className="bal-val">{profile?.balance?.toLocaleString()}원</span>
                </div>
                <button className="charge-nav-btn" onClick={() => setView('charge')}>충전하기</button>
                {user.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} className="nav-avatar" />}
                <button className="logout-btn" onClick={() => supabase.auth.signOut().then(()=>window.location.reload())}>✕</button>
              </div>
            ) : (
              <button className="discord-login-btn" onClick={() => supabase.auth.signInWithOAuth({provider:'discord'})}>DISCORD LOGIN</button>
            )}
          </div>
        </div>
      </nav>

      {/* 실시간 충전 현황 바 */}
      {user && myCharges.length > 0 && view === 'shop' && (
        <div className="status-bar anim-fade-in">
          <div className="status-inner">
            <span className="status-title">🔔 MY STATUS :</span>
            {myCharges.map(c => (
              <div key={c.id} className="status-item">
                {c.amount.toLocaleString()}원 <span className={c.status}>{c.status === 'pending' ? '대기 중' : '완료'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="content">
        {view === 'shop' ? (
          <div className="shop-layout anim-fade-in">
            {!user && (
               <div className="gate-hero">
                  <img src={LOGO_URL} className="gate-logo anim-pulse" />
                  <h1>WELCOME TO RICE STORE</h1>
                  <button onClick={() => supabase.auth.signInWithOAuth({provider:'discord'})}>ENTER WITH DISCORD</button>
               </div>
            )}
            
            <div className="grid">
              {assets.map(asset => (
                <div key={asset.id} className="card hover-anim">
                  <div className="card-top">
                    <img src={asset.image_url} alt="asset" />
                    <span className="sales-badge">구매 {asset.sales_count || 0}건</span>
                  </div>
                  <div className="card-body">
                    <h3>{asset.title}</h3>
                    <p>{asset.description}</p>
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

            <section className="reviews">
              <h2 className="sec-title">REVIEWS <small>({reviews.length})</small></h2>
              <div className="rev-grid">
                {reviews.map(r => (
                  <div key={r.id} className="rev-card">
                    <div className="rev-head"><span>{r.user_email?.split('@')[0]}***</span><span>⭐⭐⭐⭐⭐</span></div>
                    <p>{r.content}</p>
                  </div>
                ))}
                <div className="rev-card">
                  <div className="rev-head"><span>rice_fan***</span><span>⭐⭐⭐⭐⭐</span></div>
                  <p>하이엔드 디자인이 너무 멋집니다. 기능도 아주 잘 작동하네요!</p>
                </div>
              </div>
            </section>
          </div>
        ) : view === 'charge' ? (
          <div className="form-view anim-fade-in">
            <div className="glass-form">
              <h2>CHARGE WALLET</h2>
              <div className="tabs">
                <button className={chargeType==='voucher'?'active':''} onClick={()=>setChargeType('voucher')}>문화상품권</button>
                <button className={chargeType==='bank'?'active':''} onClick={()=>setChargeType('bank')}>무통장입금</button>
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
                <input name="amount" type="number" placeholder="충전 금액 (원)" required />
                {chargeType === 'voucher' ? <input name="voucher_pin" placeholder="PIN 번호 입력" required /> : <input name="sender_name" placeholder="입금자명 입력" required />}
                <button type="submit" className="btn-submit">충전 신청하기</button>
              </form>
              <button className="btn-back" onClick={()=>setView('shop')}>BACK TO STORE</button>
            </div>
          </div>
        ) : (
          /* 어드민 패널 ⭐ 대기목록, 삭제기능 통합 */
          <div className="form-view anim-fade-in">
            <div className="glass-form admin-panel-card" style={{maxWidth:'800px'}}>
              <h2 className="admin-title">ADMINISTRATION</h2>
              <input type="password" placeholder="ADMIN ACCESS CODE" className="admin-pass-input" onChange={e=>setAdminInput(e.target.value)} />
              
              {adminInput === ADMIN_PASS && (
                <div className="admin-grid-layout">
                  {/* 왼쪽: 충전 대기 목록 */}
                  <div className="admin-section">
                    <h3 className="section-subtitle">⏳ 충전 승인 대기 ({adminCharges.length})</h3>
                    <div className="admin-list scroll">
                      {adminCharges.map(r => (
                        <div key={r.id} className="admin-item-card">
                          <div className="info">
                            <strong>{r.amount.toLocaleString()}원</strong>
                            <p>{r.user_email}</p>
                            <code>{r.voucher_pin || r.sender_name}</code>
                          </div>
                          <button className="approve-btn" onClick={() => approveCharge(r)}>승인</button>
                        </div>
                      ))}
                      {adminCharges.length === 0 && <p className="empty-text">대기 중인 요청 없음</p>}
                    </div>
                  </div>

                  {/* 오른쪽: 상품 업로드 및 삭제 */}
                  <div className="admin-section">
                    <h3 className="section-subtitle">📦 상품 관리</h3>
                    <form onSubmit={handleUploadAsset} className="admin-upload-form">
                      <input name="title" placeholder="상품명" required />
                      <input name="price" type="number" placeholder="가격" required />
                      <textarea name="description" placeholder="상세 설명" required />
                      <input name="image" placeholder="이미지 URL" required />
                      <input name="file_input" type="file" required />
                      <button type="submit" className="btn-submit-small" disabled={uploading}>{uploading ? '...' : '등록'}</button>
                    </form>
                    <div className="admin-inventory scroll">
                       {assets.map(a => (
                         <div key={a.id} className="admin-item-card mini">
                           <span>{a.title}</span>
                           <button onClick={() => deleteAsset(a)} className="del-btn">삭제</button>
                         </div>
                       ))}
                    </div>
                  </div>
                </div>
              )}
              <button className="btn-back" onClick={()=>setView('shop')}>EXIT ADMIN</button>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;900&display=swap');
        body { margin: 0; background: #000; color: #fff; font-family: 'Outfit', sans-serif; overflow-x: hidden; }
        
        /* 하이엔드 네비게이션 */
        .nav { background: rgba(0,0,0,0.9); backdrop-filter: blur(20px); border-bottom: 1px solid #111; position: sticky; top:0; z-index:1000; }
        .nav-inner { max-width: 1200px; margin: 0 auto; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; }
        .logo-section { display: flex; align-items: center; gap: 15px; cursor: pointer; }
        .logo-img { width: 45px; height: 45px; border-radius: 12px; }
        .logo-text { font-size: 24px; font-weight: 900; letter-spacing: -1px; }

        .user-card { display: flex; align-items: center; gap: 15px; background: #0a0a0a; padding: 8px 20px; border-radius: 20px; border: 1px solid #1a1a1a; }
        .bal-val { font-size: 15px; font-weight: 700; color: #8ec5fc; }
        .charge-nav-btn { background: #fff; color: #000; border: none; padding: 6px 15px; border-radius: 10px; font-weight: 900; cursor: pointer; transition: 0.3s; }
        .charge-nav-btn:hover { background: #8ec5fc; }
        .nav-avatar { width: 32px; height: 32px; border-radius: 50%; }
        .logout-btn { background: none; border: none; color: #333; cursor: pointer; font-size: 18px; }

        /* 상태바 */
        .status-bar { background: #0a0a0a; border-bottom: 1px solid #111; padding: 12px 0; }
        .status-inner { max-width: 1200px; margin: 0 auto; padding: 0 20px; display: flex; gap: 20px; align-items: center; font-size: 11px; }
        .status-item { background: #000; padding: 5px 12px; border-radius: 20px; border: 1px solid #111; color: #666; }
        .pending { color: #f1c40f; font-weight: bold; }
        .success { color: #00ff88; font-weight: bold; }

        /* 상점 레이아웃 */
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 40px; padding: 60px 20px; max-width: 1200px; margin: 0 auto; }
        .card { background: #050505; border-radius: 40px; border: 1px solid #111; overflow: hidden; transition: 0.6s cubic-bezier(0.2, 1, 0.3, 1); }
        .card:hover { transform: translateY(-20px) scale(1.02); border-color: #333; box-shadow: 0 40px 80px rgba(0,0,0,0.8); }
        .card-top { height: 240px; position: relative; }
        .card-top img { width: 100%; height: 100%; object-fit: cover; }
        .sales-badge { position: absolute; top: 20px; right: 20px; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); padding: 8px 15px; border-radius: 15px; font-size: 11px; font-weight: 900; }
        
        .card-body { padding: 35px; }
        .card-body h3 { font-size: 26px; font-weight: 900; margin: 0 0 10px; }
        .card-body p { color: #444; font-size: 15px; line-height: 1.6; height: 48px; overflow: hidden; }
        .card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 35px; }
        .price { font-size: 28px; font-weight: 900; }
        .btn-buy { background: #fff; color: #000; border: none; padding: 18px 35px; border-radius: 20px; font-weight: 900; cursor: pointer; transition: 0.3s; }
        .btn-dl { background: #00ff88; color: #000; border: none; padding: 18px 35px; border-radius: 20px; font-weight: 900; cursor: pointer; }

        /* 관리자 & 폼 디자인 */
        .form-view { display: flex; justify-content: center; padding: 80px 20px; }
        .glass-form { background: #050505; border: 1px solid #111; padding: 60px; border-radius: 50px; width: 100%; box-shadow: 0 50px 100px rgba(0,0,0,1); }
        .admin-grid-layout { display: grid; grid-template-columns: 1fr 1.2fr; gap: 40px; margin-top: 40px; text-align: left; }
        .admin-section { display: flex; flex-direction: column; }
        .scroll { max-height: 400px; overflow-y: auto; padding-right: 10px; }
        .admin-item-card { display: flex; justify-content: space-between; align-items: center; background: #000; padding: 20px; border-radius: 20px; border: 1px solid #111; margin-bottom: 12px; }
        .admin-item-card.mini { padding: 12px 20px; }
        .info strong { color: #8ec5fc; display: block; margin-bottom: 5px; }
        .info p { font-size: 10px; color: #333; margin: 0; }
        .info code { font-size: 14px; color: #fff; }
        .approve-btn { background: #00ff88; color: #000; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 900; cursor: pointer; }
        .del-btn { background: #ff4d4d; color: #fff; border: none; padding: 6px 12px; border-radius: 8px; font-size: 11px; cursor: pointer; }

        input, textarea { width: 100%; padding: 20px; background: #000; border: 1px solid #111; border-radius: 20px; color: #fff; margin-bottom: 15px; box-sizing: border-box; outline: none; transition: 0.3s; font-size: 15px; }
        input:focus { border-color: #333; }
        .btn-submit { width: 100%; background: #fff; color: #000; border: none; padding: 22px; border-radius: 20px; font-weight: 900; cursor: pointer; transition: 0.3s; }
        .btn-submit-small { width: 100%; background: #fff; color: #000; border: none; padding: 15px; border-radius: 15px; font-weight: 900; cursor: pointer; margin-bottom: 20px; }
        .btn-back { background: none; border: none; color: #222; margin-top: 30px; width: 100%; cursor: pointer; font-weight: 700; }

        /* 기타 */
        .gate-hero { text-align: center; padding: 100px 0; }
        .gate-logo { width: 150px; border-radius: 30px; margin-bottom: 30px; }
        .gate-hero h1 { font-size: 3rem; font-weight: 900; letter-spacing: -2px; }
        .gate-hero button { background: #fff; color: #000; border: none; padding: 20px 50px; border-radius: 15px; font-weight: 900; cursor: pointer; transition: 0.3s; }
        .anim-fade-in { animation: fadeIn 1s ease-out; }
        .anim-pulse { animation: pulse 3s infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .loader { height: 100vh; background: #000; display: flex; justify-content: center; align-items: center; font-weight: 900; font-size: 2.5rem; letter-spacing: 15px; color: #111; }
      `}</style>
    </div>
  );
}
