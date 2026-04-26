'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RiceStoreFinalHighEnd() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assets, setAssets] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [purchasedIds, setPurchasedIds] = useState([]);
  const [myCharges, setMyCharges] = useState([]); // 내 충전 내역 상태 추가
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
    const { data: assetsData } = await supabase.from('assets').select('*').order('id', { ascending: false });
    setAssets(assetsData || []);
    const { data: revData } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
    setReviews(revData || []);
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      setUser(u);
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single();
      setProfile(p);
      const { data: pur } = await supabase.from('purchases').select('asset_id').eq('user_id', u.id);
      setPurchasedIds(pur?.map(item => item.asset_id) || []);
      // 내 충전 내역 가져오기
      const { data: char } = await supabase.from('charge_requests').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(3);
      setMyCharges(char || []);

      if (!localStorage.getItem(`joined_${u.id}`)) {
        sendWebhook(WEBHOOKS.JOIN, "🎉 신규 입장", `**유저:** ${u.email}`, 0x00ff00);
        localStorage.setItem(`joined_${u.id}`, 'true');
      }
    }
    setLoading(false);
  }

  async function sendWebhook(url, title, message, color) {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{ title, description: message, color, thumbnail: { url: LOGO_URL }, timestamp: new Date().toISOString() }]
      })
    });
  }

  async function buyAsset(asset) {
    if (!profile || profile.balance < asset.price) return alert('은하수 잔액이 부족합니다.');
    await supabase.from('profiles').update({ balance: profile.balance - asset.price }).eq('id', user.id);
    await supabase.from('purchases').insert({ user_id: user.id, asset_id: asset.id });
    await supabase.from('assets').update({ sales_count: (asset.sales_count || 0) + 1 }).eq('id', asset.id);
    sendWebhook(WEBHOOKS.BUY, "🛍️ 구매 완료", `**구매자:** ${user.email}\n**상품:** ${asset.title}\n**금액:** ${asset.price}원`, 0x3498db);
    alert('🎉 구매 완료! DOWNLOAD 버튼을 클릭해 파일을 받으세요.');
    init();
  }

  async function handleUploadAsset(e) {
    e.preventDefault();
    if (adminInput !== ADMIN_PASS) return alert('비밀번호가 틀렸습니다.');
    setUploading(true);
    const form = e.target;
    const file = form.file_input.files[0];
    const fileName = `${Date.now()}_${file.name}`;
    const { error: storageErr } = await supabase.storage.from('asset-files').upload(fileName, file);
    if (storageErr) return alert('파일 업로드 실패: ' + storageErr.message);

    await supabase.from('assets').insert({
      title: form.title.value, price: parseInt(form.price.value),
      description: form.description.value, image_url: form.image.value, file_path: fileName
    });
    sendWebhook(WEBHOOKS.UPLOAD, "📦 에셋 등록 완료", `**에셋:** ${form.title.value}\n**가격:** ${form.price.value}원`, 0x9b59b6);
    alert('등록 완료!'); setView('shop'); init();
    setUploading(false);
  }

  if (loading) return <div className="loader"><span>RICE STORE</span></div>

  if (!user) return (
    <div className="gate">
      <div className="gate-card">
        <img src={LOGO_URL} className="gate-logo pulse" />
        <h1 className="neon-text">RICE STORE</h1>
        <p>Expertly Crafted Roblox Assets</p>
        <button onClick={() => supabase.auth.signInWithOAuth({provider:'discord'})} className="discord-main-btn">
          ENTER WITH DISCORD
        </button>
      </div>
      <style jsx>{`
        .gate { height: 100vh; background: #000; display: flex; justify-content: center; align-items: center; }
        .gate-card { background: #080808; padding: 70px; border-radius: 60px; border: 1px solid #1a1a1a; text-align: center; box-shadow: 0 40px 100px rgba(0,0,0,1); animation: slideIn 1s cubic-bezier(0.2, 1, 0.3, 1); }
        .gate-logo { width: 140px; border-radius: 30px; margin-bottom: 25px; box-shadow: 0 0 30px rgba(142,197,252,0.3); }
        .neon-text { font-size: 3.5rem; font-weight: 900; color: #fff; margin: 0; letter-spacing: -3px; }
        .discord-main-btn { margin-top: 40px; background: #fff; color: #000; border: none; padding: 22px 60px; border-radius: 25px; font-weight: 900; font-size: 1.1rem; cursor: pointer; transition: 0.4s; }
        .discord-main-btn:hover { background: #8ec5fc; transform: translateY(-10px); box-shadow: 0 20px 40px rgba(142,197,252,0.3); }
        @keyframes slideIn { from { opacity: 0; transform: translateY(50px); } to { opacity: 1; transform: translateY(0); } }
        .pulse { animation: pulse 3s infinite; }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
      `}</style>
    </div>
  );

  return (
    <div className="app-container">
      <nav className="nav">
        <div className="nav-inner">
          <div className="logo-section" onClick={() => setView('shop')}>
            <img src={LOGO_URL} className="logo-img" />
            <span className="logo-text">RICE STORE</span>
          </div>
          <div className="nav-right">
            <span className="admin-btn" onClick={() => setView('admin')}>ADMIN</span>
            <div className="user-card">
              <div className="balance-info">
                <span className="bal-label">BALANCE</span>
                <span className="bal-val">{profile?.balance?.toLocaleString()}원</span>
              </div>
              <button className="charge-nav" onClick={() => setView('charge')}>+</button>
              <img src={user.user_metadata.avatar_url} className="nav-avatar" />
              <button className="logout-btn" onClick={() => supabase.auth.signOut().then(()=>window.location.reload())}>✕</button>
            </div>
          </div>
        </div>
      </nav>

      {/* 내 충전 신청 현황 (네이버 스토어 스타일) */}
      {user && view === 'shop' && myCharges.length > 0 && (
        <div className="charge-status-bar">
          <div className="status-inner">
            <span className="status-title">🔔 충전 알림 :</span>
            {myCharges.map(c => (
              <div key={c.id} className="status-item">
                {c.amount.toLocaleString()}원 
                <span className={`badge ${c.status}`}>
                  {c.status === 'pending' ? '대기 중' : c.status === 'success' ? '충전 완료' : '거절됨'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="content">
        {view === 'shop' ? (
          <div className="shop-grid fade-in">
            <div className="grid">
              {assets.map(asset => (
                <div key={asset.id} className="card">
                  <div className="card-top">
                    <img src={asset.image_url} />
                    <span className="sales-badge">구매 {asset.sales_count || 0}건</span>
                  </div>
                  <div className="card-body">
                    <h3>{asset.title}</h3>
                    <p>{asset.description}</p>
                    <div className="card-footer">
                      <span className="price">{asset.price.toLocaleString()}원</span>
                      {purchasedIds.includes(asset.id) ? (
                        <button onClick={async () => {
                          const { data } = await supabase.storage.from('asset-files').createSignedUrl(asset.file_path, 60);
                          window.location.href = data.signedUrl;
                        }} className="btn-dl">DOWNLOAD</button>
                      ) : (
                        <button onClick={() => buyAsset(asset)} className="btn-buy">PURCHASE</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <section className="reviews">
              <h2 className="sec-title">REVIEW <small>({reviews.length})</small></h2>
              <div className="rev-grid">
                {reviews.map(r => (
                  <div key={r.id} className="rev-card">
                    <div className="rev-head"><span>{r.user_email?.split('@')[0]}***</span><span>⭐⭐⭐⭐⭐</span></div>
                    <p>{r.content}</p>
                  </div>
                ))}
                <div className="rev-card">
                  <div className="rev-head"><span>admin_rice***</span><span>⭐⭐⭐⭐⭐</span></div>
                  <p>고객 만족을 최우선으로 하는 라이스 스토어입니다. 많은 이용 부탁드립니다!</p>
                </div>
              </div>
            </section>
          </div>
        ) : view === 'charge' ? (
          <div className="form-view fade-in">
            <div className="glass-form">
              <h2>CHARGE POINT</h2>
              <div className="tabs">
                <button className={chargeType==='voucher'?'active':''} onClick={()=>setChargeType('voucher')}>문화상품권</button>
                <button className={chargeType==='bank'?'active':''} onClick={()=>setChargeType('bank')}>무통장입금</button>
              </div>
              <form onSubmit={requestCharge}>
                <input name="amount" type="number" placeholder="금액 (숫자만 입력)" required />
                {chargeType === 'voucher' ? <input name="voucher_pin" placeholder="PIN 번호 (0000-0000-0000-000000)" required /> : <input name="sender_name" placeholder="입금자 성함" required />}
                <button type="submit" className="btn-submit">충전 신청하기</button>
              </form>
              <button className="btn-back" onClick={()=>setView('shop')}>BACK TO STORE</button>
            </div>
          </div>
        ) : (
          <div className="form-view fade-in">
            <div className="glass-form" style={{maxWidth:'600px'}}>
              <h2>ADMINISTRATION</h2>
              <input type="password" placeholder="ADMIN CODE" className="admin-input" onChange={e=>setAdminInput(e.target.value)} />
              {adminInput === ADMIN_PASS && (
                <div className="admin-content">
                   <form onSubmit={handleUploadAsset} className="upload-form">
                    <input name="title" placeholder="에셋 이름" required />
                    <input name="price" type="number" placeholder="가격(원)" required />
                    <textarea name="description" placeholder="상세 설명" required />
                    <input name="image" placeholder="이미지 URL" required />
                    <label style={{fontSize:'10px', color:'#555'}}>로블록스 파일(.rbxm):</label>
                    <input name="file_input" type="file" required style={{border:'none', fontSize:'12px'}} />
                    <button type="submit" className="btn-submit" disabled={uploading}>
                      {uploading ? 'UPLOADING...' : 'UPLOAD ASSET'}
                    </button>
                  </form>
                  <hr style={{borderColor:'#111', margin:'30px 0'}} />
                  <h3 style={{fontSize:'14px'}}>신청된 충전 목록</h3>
                  <AdminChargeList onApprove={async (req) => {
                    const { data: p } = await supabase.from('profiles').select('balance').eq('id', req.user_id).single();
                    await supabase.from('profiles').update({ balance: (p.balance || 0) + req.amount }).eq('id', req.user_id);
                    await supabase.from('charge_requests').update({ status: 'success' }).eq('id', req.id);
                    alert('승인되었습니다!'); init();
                  }} />
                </div>
              )}
              <button className="btn-back" onClick={()=>setView('shop')}>EXIT</button>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>&copy; 2024 RICE STORE. HIGH-END ASSET SERVICE.</p>
      </footer>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;900&display=swap');
        body { margin: 0; background: #000; color: #fff; font-family: 'Outfit', sans-serif; }
        .nav { background: rgba(0,0,0,0.9); backdrop-filter: blur(20px); border-bottom: 1px solid #111; position: sticky; top: 0; z-index: 1000; }
        .nav-inner { max-width: 1200px; margin: 0 auto; padding: 20px; display: flex; justify-content: space-between; align-items: center; }
        .logo-section { display: flex; align-items: center; gap: 15px; cursor: pointer; }
        .logo-img { width: 45px; height: 45px; border-radius: 12px; border: 1px solid #222; }
        .logo-text { font-size: 24px; font-weight: 900; letter-spacing: -1px; }

        .user-card { display: flex; align-items: center; gap: 15px; background: #0a0a0a; padding: 8px 20px; border-radius: 20px; border: 1px solid #1a1a1a; }
        .balance-info { display: flex; flex-direction: column; text-align: right; }
        .bal-label { font-size: 8px; color: #444; font-weight: 900; }
        .bal-val { font-size: 15px; font-weight: 700; color: #fff; }
        .charge-nav { background: #fff; color: #000; border: none; width: 25px; height: 25px; border-radius: 8px; font-weight: 900; cursor: pointer; }
        .nav-avatar { width: 30px; height: 30px; border-radius: 50%; border: 1px solid #222; }
        .logout-btn { background: none; border: none; color: #333; cursor: pointer; font-size: 18px; }
        .admin-btn { font-size: 10px; color: #111; cursor: pointer; font-weight: 900; }

        /* 충전 현황 바 */
        .charge-status-bar { background: #0a0a0a; border-bottom: 1px solid #111; padding: 10px 0; }
        .status-inner { max-width: 1200px; margin: 0 auto; padding: 0 20px; display: flex; gap: 20px; align-items: center; font-size: 12px; }
        .status-title { color: #555; font-weight: 900; }
        .status-item { background: #000; padding: 5px 12px; border-radius: 30px; border: 1px solid #111; color: #888; }
        .badge { margin-left: 8px; font-weight: 900; font-size: 10px; }
        .badge.pending { color: #f1c40f; }
        .badge.success { color: #00ff88; }

        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 40px; padding: 60px 20px; max-width: 1200px; margin: 0 auto; }
        .card { background: #050505; border-radius: 40px; border: 1px solid #111; overflow: hidden; transition: 0.5s cubic-bezier(0.2, 1, 0.3, 1); }
        .card:hover { transform: translateY(-20px) scale(1.02); border-color: #222; box-shadow: 0 40px 80px rgba(0,0,0,0.8); }
        .card-top { height: 240px; position: relative; }
        .card-top img { width: 100%; height: 100%; object-fit: cover; filter: brightness(0.8); }
        .sales-badge { position: absolute; top: 20px; right: 20px; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); padding: 8px 15px; border-radius: 15px; font-size: 11px; font-weight: 900; }
        
        .card-body { padding: 35px; }
        .card-body h3 { font-size: 26px; font-weight: 900; margin: 0 0 10px; color: #fff; }
        .card-body p { color: #444; font-size: 15px; line-height: 1.6; height: 48px; overflow: hidden; }
        .card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 35px; }
        .price { font-size: 28px; font-weight: 900; color: #fff; }
        .btn-buy { background: #fff; color: #000; border: none; padding: 18px 35px; border-radius: 20px; font-weight: 900; cursor: pointer; transition: 0.3s; }
        .btn-dl { background: #00ff88; color: #000; border: none; padding: 18px 35px; border-radius: 20px; font-weight: 900; cursor: pointer; }

        .reviews { max-width: 1200px; margin: 0 auto; padding: 100px 20px; border-top: 1px solid #111; }
        .sec-title { font-size: 32px; font-weight: 900; margin-bottom: 50px; color: #fff; }
        .rev-card { background: #050505; padding: 35px; border-radius: 30px; border: 1px solid #111; margin-bottom: 20px; }
        .rev-head { display: flex; justify-content: space-between; color: #333; font-weight: 900; font-size: 13px; margin-bottom: 15px; }

        .form-view { display: flex; justify-content: center; padding: 100px 20px; }
        .glass-form { background: #050505; border: 1px solid #111; padding: 60px; border-radius: 50px; width: 100%; max-width: 550px; box-shadow: 0 50px 100px rgba(0,0,0,1); }
        .tabs { display: flex; gap: 15px; margin-bottom: 40px; }
        .tabs button { flex: 1; padding: 18px; background: #000; border: 1px solid #111; color: #333; border-radius: 20px; cursor: pointer; font-weight: 900; transition: 0.3s; }
        .tabs button.active { background: #fff; color: #000; }
        input, textarea { width: 100%; padding: 20px; background: #000; border: 1px solid #111; border-radius: 20px; color: #fff; margin-bottom: 20px; box-sizing: border-box; outline: none; transition: 0.3s; }
        input:focus { border-color: #333; }
        .btn-submit { width: 100%; background: #fff; color: #000; border: none; padding: 22px; border-radius: 20px; font-weight: 900; cursor: pointer; transition: 0.3s; }
        .btn-submit:hover { background: #8ec5fc; }

        .loader { height: 100vh; background: #000; display: flex; justify-content: center; align-items: center; font-weight: 900; font-size: 2.5rem; letter-spacing: 15px; color: #080808; }
        .fade-in { animation: fadeIn 1s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .footer { text-align: center; padding: 100px 0; color: #080808; font-weight: 900; letter-spacing: 5px; }
      `}</style>
    </div>
  );
}

function AdminChargeList({ onApprove }) {
  const [list, setList] = useState([]);
  useEffect(() => { supabase.from('charge_requests').select('*').eq('status', 'pending').then(({data})=>setList(data || [])); }, []);
  return (
    <div style={{marginTop:'20px'}}>
      {list.map(r => (
        <div key={r.id} style={{padding:'20px', background:'#000', border:'1px solid #111', borderRadius:'20px', marginBottom:'15px'}}>
          <p style={{margin:0, color:'#8ec5fc'}}><strong>{r.request_type==='voucher'?'🎫 문상':'🏦 무통장'} - {r.amount.toLocaleString()}원</strong></p>
          <p style={{color:'#333', fontSize:'11px'}}>{r.user_email}</p>
          <p style={{color:'#fff', fontWeight:'bold', fontSize:'16px', background:'#080808', padding:'10px', borderRadius:'10px', margin:'10px 0'}}>{r.voucher_pin || r.sender_name}</p>
          <button onClick={()=>onApprove(r)} style={{width:'100%', padding:'12px', background:'#fff', border:'none', borderRadius:'12px', cursor:'pointer', fontWeight:'900'}}>승인하기</button>
        </div>
      ))}
      {list.length === 0 && <p style={{color:'#222', textAlign:'center'}}>대기 중인 요청이 없습니다.</p>}
    </div>
  );
}
