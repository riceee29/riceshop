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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
    const { error } = await supabase.from('profiles').update({ balance: profile.balance - asset.price }).eq('id', user.id);
    if (!error) {
      await supabase.from('purchases').insert({ user_id: user.id, asset_id: asset.id });
      await supabase.from('assets').update({ sales_count: (asset.sales_count || 0) + 1 }).eq('id', asset.id);
      sendWebhook(WEBHOOKS.BUY, "🛍️ 구매 완료", `**구매자:** ${user?.email}\n**상품:** ${asset.title}\n**금액:** ${asset.price}원`, 0x3498db);
      alert('🎉 구매 완료! DOWNLOAD 버튼이 활성화되었습니다.');
      init();
    }
  }

  async function handleUploadAsset(e) {
    e.preventDefault();
    if (adminInput !== ADMIN_PASS) return alert('관리자 비밀번호가 틀렸습니다.');
    setUploading(true);
    const form = e.target;
    const file = form.file_input.files[0];
    const fileName = `${Date.now()}_${file.name}`;
    try {
      await supabase.storage.from('asset-files').upload(fileName, file);
      await supabase.from('assets').insert({
        title: form.title.value, price: parseInt(form.price.value),
        description: form.description.value, image_url: form.image.value, file_path: fileName
      });
      sendWebhook(WEBHOOKS.UPLOAD, "📦 에셋 등록 완료", `**에셋:** ${form.title.value}\n**가격:** ${form.price.value}원`, 0x9b59b6);
      alert('등록 성공!'); setView('shop'); init();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="loader"><span>RICE STORE</span></div>;

  if (!user) return (
    <div className="gate">
      <div className="gate-card">
        <img src={LOGO_URL} className="gate-logo" alt="logo" />
        <h1>RICE STORE</h1>
        <p>Premium Roblox Assets</p>
        <button onClick={() => supabase.auth.signInWithOAuth({provider:'discord'})} className="discord-main-btn">
          LOGIN WITH DISCORD
        </button>
      </div>
      <style jsx>{`
        .gate { height: 100vh; background: #000; display: flex; justify-content: center; align-items: center; color: #fff; }
        .gate-card { background: #0a0a0a; padding: 60px; border-radius: 40px; border: 1px solid #1a1a1a; text-align: center; }
        .gate-logo { width: 120px; border-radius: 20px; margin-bottom: 20px; border: 2px solid #333; }
        .discord-main-btn { background: #fff; color: #000; border: none; padding: 15px 40px; border-radius: 12px; font-weight: 900; cursor: pointer; margin-top: 30px; }
      `}</style>
    </div>
  );

  return (
    <div className="container">
      <nav className="nav">
        <div className="nav-inner">
          <div className="logo" onClick={() => setView('shop')}>
            <img src={LOGO_URL} className="nav-logo" alt="logo" />
            <span>RICE STORE</span>
          </div>
          <div className="nav-right">
            <span className="admin-btn" onClick={() => setView('admin')}>ADMIN</span>
            <div className="user-badge">
              <span className="balance">{profile?.balance?.toLocaleString()}원</span>
              <button className="charge-nav" onClick={() => setView('charge')}>+</button>
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
          <div className="grid">
            {assets.map(asset => (
              <div key={asset.id} className="card">
                <div className="card-img-box">
                  <img src={asset.image_url} alt="asset" />
                  <span className="sales-badge">구매 {asset.sales_count || 0}</span>
                </div>
                <div className="card-body">
                  <h3>{asset.title}</h3>
                  <p>{asset.description}</p>
                  <div className="card-footer">
                    <span className="price">{asset.price.toLocaleString()}원</span>
                    {purchasedIds.includes(asset.id) ? (
                      <button onClick={async () => {
                        const { data } = await supabase.storage.from('asset-files').createSignedUrl(asset.file_path, 60);
                        if (data) window.location.href = data.signedUrl;
                      }} className="dl-btn">DOWNLOAD</button>
                    ) : (
                      <button onClick={() => buyAsset(asset)} className="buy-btn">PURCHASE</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
                {chargeType === 'voucher' ? <input name="voucher_pin" placeholder="PIN 번호" required /> : <input name="sender_name" placeholder="입금자명" required />}
                <button type="submit" className="submit-btn">충전 신청하기</button>
              </form>
              <button className="back-btn" onClick={() => setView('shop')}>돌아가기</button>
            </div>
          </div>
        ) : (
          <div className="form-view">
            <div className="glass-card">
              <h2>관리자 패널</h2>
              <input type="password" placeholder="비밀번호" onChange={e => setAdminInput(e.target.value)} />
              {adminInput === ADMIN_PASS && (
                <form onSubmit={handleUploadAsset} style={{display:'flex', flexDirection:'column', gap:'10px', marginTop:'20px'}}>
                  <input name="title" placeholder="상품명" required />
                  <input name="price" type="number" placeholder="가격" required />
                  <textarea name="description" placeholder="설명" required style={{background:'#000', color:'#fff', padding:'10px', borderRadius:'10px', border:'1px solid #222'}} />
                  <input name="image" placeholder="이미지 URL" required />
                  <input name="file_input" type="file" required style={{border:'none'}} />
                  <button type="submit" className="submit-btn" disabled={uploading}>{uploading ? '업로드 중...' : '등록하기'}</button>
                </form>
              )}
              <button className="back-btn" onClick={() => setView('shop')}>나가기</button>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        body { margin: 0; background: #000; color: #fff; font-family: sans-serif; }
        .nav { background: #050505; border-bottom: 1px solid #111; position: sticky; top: 0; z-index: 100; }
        .nav-inner { max-width: 1200px; margin: 0 auto; padding: 20px; display: flex; justify-content: space-between; align-items: center; }
        .logo { display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 900; font-size: 24px; }
        .nav-logo { width: 40px; height: 40px; border-radius: 10px; }
        .user-badge { display: flex; align-items: center; gap: 12px; background: #0a0a0a; padding: 8px 20px; border-radius: 30px; border: 1px solid #222; }
        .balance { font-weight: bold; color: #8ec5fc; }
        .charge-nav { background: #fff; border: none; width: 24px; height: 24px; border-radius: 6px; font-weight: bold; cursor: pointer; }
        .nav-avatar { width: 30px; height: 30px; border-radius: 50%; border: 1px solid #333; }
        .logout-btn { background: none; border: none; color: #444; cursor: pointer; font-size: 18px; }
        .admin-btn { font-size: 11px; color: #111; cursor: pointer; }
        .status-bar { background: #0a0a0a; padding: 12px; text-align: center; border-bottom: 1px solid #111; display: flex; gap: 20px; justify-content: center; font-size: 12px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 35px; padding: 60px 20px; max-width: 1200px; margin: 0 auto; }
        .card { background: #080808; border-radius: 30px; border: 1px solid #1a1a1a; overflow: hidden; transition: 0.3s; }
        .card:hover { transform: translateY(-10px); border-color: #333; }
        .card-img-box { height: 200px; position: relative; }
        .card-img-box img { width: 100%; height: 100%; object-fit: cover; }
        .sales-badge { position: absolute; top: 15px; left: 15px; background: rgba(0,0,0,0.7); padding: 5px 12px; border-radius: 10px; font-size: 11px; font-weight: bold; }
        .card-body { padding: 25px; }
        .card-body p { color: #555; font-size: 14px; margin-bottom: 20px; height: 40px; overflow: hidden; }
        .card-footer { display: flex; justify-content: space-between; align-items: center; }
        .price { font-size: 22px; font-weight: 900; }
        .buy-btn { background: #fff; color: #000; border: none; padding: 12px 25px; border-radius: 12px; font-weight: bold; cursor: pointer; }
        .dl-btn { background: #00ff88; color: #000; border: none; padding: 12px 25px; border-radius: 12px; font-weight: bold; cursor: pointer; }
        .form-view { display: flex; justify-content: center; padding: 100px 20px; }
        .glass-card { background: #0a0a0a; padding: 50px; border-radius: 40px; border: 1px solid #1a1a1a; width: 100%; max-width: 500px; }
        .tabs { display: flex; gap: 10px; margin-bottom: 30px; }
        .tabs button { flex: 1; padding: 12px; background: #000; border: 1px solid #222; color: #444; border-radius: 12px; cursor: pointer; }
        .tabs button.active { background: #fff; color: #000; }
        input { width: 100%; padding: 15px; background: #000; border: 1px solid #222; border-radius: 12px; color: #fff; margin-bottom: 15px; box-sizing: border-box; outline: none; }
        .submit-btn { width: 100%; background: #fff; color: #000; border: none; padding: 15px; border-radius: 12px; font-weight: 900; cursor: pointer; }
        .back-btn { background: none; border: none; color: #333; margin-top: 20px; width: 100%; cursor: pointer; }
        .loader { height: 100vh; background: #000; display: flex; justify-content: center; align-items: center; font-weight: 900; color: #222; font-size: 2rem; }
      `}</style>
    </div>
  );
}
