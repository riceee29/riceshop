'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RiceStoreFinal() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assets, setAssets] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [purchasedIds, setPurchasedIds] = useState([]);
  const [myCharges, setMyCharges] = useState([]); 
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
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function sendWebhook(url, title, message, color) {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{ title, description: message, color, thumbnail: { url: LOGO_URL }, timestamp: new Date().toISOString() }]
        })
      });
    } catch (e) {}
  }

  async function buyAsset(asset) {
    if (!profile || profile.balance < asset.price) return alert('잔액이 부족합니다.');
    const { error: pErr } = await supabase.from('profiles').update({ balance: profile.balance - asset.price }).eq('id', user.id);
    if (!pErr) {
      await supabase.from('purchases').insert({ user_id: user.id, asset_id: asset.id });
      await supabase.from('assets').update({ sales_count: (asset.sales_count || 0) + 1 }).eq('id', asset.id);
      sendWebhook(WEBHOOKS.BUY, "🛍️ 구매 완료", `**구매자:** ${user?.email}\n**상품:** ${asset.title}\n**금액:** ${asset.price}원`, 0x3498db);
      alert('🎉 구매 완료! DOWNLOAD 버튼을 클릭하세요.');
      init();
    }
  }

  async function downloadAsset(asset) {
    if (!asset.file_path) return alert('파일이 없습니다.');
    try {
      const { data, error } = await supabase.storage.from('asset-files').createSignedUrl(asset.file_path, 60);
      if (error) throw error;
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.setAttribute('download', `${asset.title}.rbxm`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) { alert('다운로드 실패: ' + err.message); }
  }

  async function handleUploadAsset(e) {
    e.preventDefault();
    if (adminInput !== ADMIN_PASS) return alert('비밀번호 오류');
    setUploading(true);
    const form = e.target;
    const file = form.file_input.files[0];
    const fileExtension = file.name.split('.').pop();
    const safeFileName = `${Date.now()}.${fileExtension}`; 
    try {
      const { error: sErr } = await supabase.storage.from('asset-files').upload(safeFileName, file);
      if (sErr) throw sErr;
      await supabase.from('assets').insert({
        title: form.title.value, price: parseInt(form.price.value),
        description: form.description.value, image_url: form.image.value, file_path: safeFileName
      });
      sendWebhook(WEBHOOKS.UPLOAD, "📦 에셋 등록 완료", `**에셋:** ${form.title.value}\n**가격:** ${form.price.value}원`, 0x9b59b6);
      alert('등록 성공!'); setView('shop'); init();
    } catch (err) { alert(err.message); }
    setUploading(false);
  }

  if (loading) return <div className="loader"><span>RICE STORE</span></div>;

  if (!user) return (
    <div className="gate">
      <div className="gate-card">
        <img src={LOGO_URL} className="gate-logo" alt="logo" />
        <h1 className="neon-text">RICE STORE</h1>
        <button onClick={() => supabase.auth.signInWithOAuth({provider:'discord', options:{redirectTo:window.location.origin}})} className="discord-main-btn">
          ENTER WITH DISCORD
        </button>
      </div>
      <style jsx>{`
        .gate { height: 100vh; background: #000; display: flex; justify-content: center; align-items: center; color: #fff; }
        .gate-card { background: #080808; padding: 70px; border-radius: 60px; border: 1px solid #1a1a1a; text-align: center; }
        .gate-logo { width: 140px; border-radius: 30px; margin-bottom: 25px; }
        .neon-text { font-size: 3.5rem; font-weight: 900; letter-spacing: -3px; }
        .discord-main-btn { margin-top: 40px; background: #fff; color: #000; border: none; padding: 22px 60px; border-radius: 25px; font-weight: 900; cursor: pointer; }
      `}</style>
    </div>
  );

  return (
    <div className="app-container">
      <nav className="nav">
        <div className="nav-inner">
          <div className="logo-section" onClick={() => setView('shop')}>
            <img src={LOGO_URL} className="logo-img" alt="logo" />
            <span className="logo-text">RICE STORE</span>
          </div>
          <div className="nav-right">
            <span className="admin-btn" onClick={() => setView('admin')}>ADMIN</span>
            <div className="user-card">
              <div className="balance-info">
                <span className="bal-val">{profile?.balance?.toLocaleString()}원</span>
              </div>
              <button className="charge-nav-btn" onClick={() => setView('charge')}>충전하기</button>
              {user?.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} className="nav-avatar" alt="avatar" />}
              <button className="logout-btn" onClick={() => supabase.auth.signOut().then(()=>window.location.reload())}>✕</button>
            </div>
          </div>
        </div>
      </nav>

      {myCharges.length > 0 && view === 'shop' && (
        <div className="status-bar">
          {myCharges.map(c => (
            <div key={c.id} className="status-item">
              🔔 {c.amount.toLocaleString()}원 충전 신청 - {c.status === 'pending' ? '대기 중' : '완료'}
            </div>
          ))}
        </div>
      )}

      <main className="content">
        {view === 'shop' ? (
          <div className="shop-grid">
            <div className="grid">
              {assets.map(asset => (
                <div key={asset.id} className="card">
                  <div className="card-top">
                    <img src={asset.image_url} alt="asset" />
                    <span className="sales-badge">구매 {asset.sales_count || 0}</span>
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
          </div>
        ) : view === 'charge' ? (
          <div className="form-view">
            <div className="glass-card">
              <h2>포인트 충전 신청</h2>
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
                <input name="amount" type="number" placeholder="금액 (원)" required />
                {chargeType === 'voucher' ? <input name="voucher_pin" placeholder="PIN 번호를 입력하세요" required /> : <input name="sender_name" placeholder="입금자 성함" required />}
                <button type="submit" className="submit-btn">신청하기</button>
              </form>
              <button className="back-btn" onClick={() => setView('shop')}>돌아가기</button>
            </div>
          </div>
        ) : (
          <div className="form-view">
            <div className="glass-card">
              <h2>ADMIN PANEL</h2>
              <input type="password" placeholder="ADMIN CODE" className="admin-input" onChange={e=>setAdminInput(e.target.value)} />
              {adminInput === ADMIN_PASS && (
                <div className="admin-content">
                   <form onSubmit={handleUploadAsset} className="upload-form">
                    <input name="title" placeholder="에셋 이름" required />
                    <input name="price" type="number" placeholder="가격(원)" required />
                    <textarea name="description" placeholder="설명" required style={{background:'#000', color:'#fff', padding:'15px', borderRadius:'15px', border:'1px solid #111', marginBottom:'15px', width:'100%'}} />
                    <input name="image" placeholder="이미지 URL" required />
                    <input name="file_input" type="file" required style={{border:'none', marginBottom:'20px'}} />
                    <button type="submit" className="submit-btn" disabled={uploading}>{uploading ? 'UPLOADING...' : 'REGISTER'}</button>
                  </form>
                  <hr style={{borderColor:'#111', margin:'30px 0'}} />
                  <AdminList init={init} />
                </div>
              )}
              <button className="back-btn" onClick={()=>setView('shop')}>EXIT</button>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;900&display=swap');
        body { margin: 0; background: #000; color: #fff; font-family: 'Outfit', sans-serif; }
        .nav { background: rgba(0,0,0,0.9); backdrop-filter: blur(20px); border-bottom: 1px solid #111; position: sticky; top: 0; z-index: 1000; }
        .nav-inner { max-width: 1200px; margin: 0 auto; padding: 20px; display: flex; justify-content: space-between; align-items: center; }
        .logo-section { display: flex; align-items: center; gap: 15px; cursor: pointer; }
        .logo-img { width: 45px; height: 45px; border-radius: 12px; }
        .logo-text { font-size: 24px; font-weight: 900; }
        .user-card { display: flex; align-items: center; gap: 15px; background: #0a0a0a; padding: 8px 20px; border-radius: 20px; border: 1px solid #1a1a1a; }
        .bal-val { font-size: 15px; font-weight: 700; color: #8ec5fc; }
        .charge-nav-btn { background: #fff; color: #000; border: none; padding: 6px 15px; border-radius: 10px; font-weight: 900; cursor: pointer; }
        .nav-avatar { width: 30px; height: 30px; border-radius: 50%; }
        .logout-btn { background: none; border: none; color: #333; cursor: pointer; font-size: 18px; }
        .admin-btn { font-size: 10px; color: #111; cursor: pointer; }
        .status-bar { background: #0a0a0a; border-bottom: 1px solid #111; padding: 12px; display: flex; gap: 20px; justify-content: center; font-size: 12px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 40px; padding: 60px 20px; max-width: 1200px; margin: 0 auto; }
        .card { background: #050505; border-radius: 40px; border: 1px solid #111; overflow: hidden; transition: 0.5s; }
        .card:hover { transform: translateY(-20px); border-color: #222; }
        .card-top { height: 240px; position: relative; }
        .card-top img { width: 100%; height: 100%; object-fit: cover; }
        .sales-badge { position: absolute; top: 20px; right: 20px; background: rgba(0,0,0,0.8); padding: 8px 15px; border-radius: 15px; font-size: 11px; font-weight: 900; }
        .card-body { padding: 35px; }
        .card-body h3 { font-size: 26px; font-weight: 900; margin: 0 0 10px; }
        .card-body p { color: #444; font-size: 15px; height: 48px; overflow: hidden; }
        .card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 35px; }
        .price { font-size: 28px; font-weight: 900; }
        .btn-buy { background: #fff; color: #000; border: none; padding: 18px 35px; border-radius: 20px; font-weight: 900; cursor: pointer; }
        .btn-dl { background: #00ff88; color: #000; border: none; padding: 18px 35px; border-radius: 20px; font-weight: 900; cursor: pointer; }
        .form-view { display: flex; justify-content: center; padding: 100px 20px; }
        .glass-card { background: #050505; border: 1px solid #111; padding: 60px; border-radius: 50px; width: 100%; max-width: 550px; }
        .tabs { display: flex; gap: 15px; margin-bottom: 40px; }
        .tabs button { flex: 1; padding: 18px; background: #000; border: 1px solid #111; color: #333; border-radius: 20px; cursor: pointer; }
        .tabs button.active { background: #fff; color: #000; }
        input { width: 100%; padding: 20px; background: #000; border: 1px solid #111; border-radius: 20px; color: #fff; margin-bottom: 20px; box-sizing: border-box; outline: none; }
        .submit-btn { width: 100%; background: #fff; color: #000; border: none; padding: 22px; border-radius: 20px; font-weight: 900; cursor: pointer; }
        .back-btn { background: none; border: none; color: #333; margin-top: 20px; width: 100%; cursor: pointer; font-weight: 700; }
        .loader { height: 100vh; background: #000; display: flex; justify-content: center; align-items: center; font-weight: 900; font-size: 2rem; }
      `}</style>
    </div>
  );
}

// --- 관리자 목록 컴포넌트 ---
function AdminList({ init }) {
  const [list, setList] = useState([]);
  useEffect(() => { supabase.from('charge_requests').select('*').eq('status', 'pending').then(({data})=>setList(data || [])); }, []);
  
  const approve = async (r) => {
    const { data: p } = await supabase.from('profiles').select('balance').eq('id', r.user_id).single();
    await supabase.from('profiles').update({ balance: (p.balance || 0) + r.amount }).eq('id', r.user_id);
    await supabase.from('charge_requests').update({ status: 'success' }).eq('id', r.id);
    alert('승인 완료');
    init();
  };

  return (
    <div>
      {list.map(r => (
        <div key={r.id} style={{padding:'20px', background:'#000', border:'1px solid #111', borderRadius:'20px', marginBottom:'15px'}}>
          <p style={{margin:0, color:'#8ec5fc'}}><strong>{r.request_type==='voucher'?'🎫 문상':'🏦 무통장'} - {r.amount.toLocaleString()}원</strong></p>
          <p style={{color:'#fff', fontWeight:'bold', margin:'10px 0'}}>{r.voucher_pin || r.sender_name}</p>
          <button onClick={()=>approve(r)} style={{width:'100%', padding:'12px', background:'#fff', border:'none', borderRadius:'12px', cursor:'pointer', fontWeight:'900'}}>승인하기</button>
        </div>
      ))}
    </div>
  );
}
