'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RiceStoreUltimateLogVersion() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assets, setAssets] = useState([]);
  const [purchasedIds, setPurchasedIds] = useState([]);
  const [view, setView] = useState('shop'); 
  const [loading, setLoading] = useState(true);
  const [chargeType, setChargeType] = useState('voucher');
  const [adminInput, setAdminInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const ADMIN_PASS = '20140419ju!';

  const LOGO_URL = "https://cdn.discordapp.com/attachments/1449379705546473502/1497840261915480134/Gemini_Generated_Image_rmtwv7rmtwv7rmtw.png?ex=69eefbf2&is=69edaa72&hm=743bba23cb19d2d9392aebe794b30acda7fb3ee6d4b050b7dffd648a9eabf1c8&";

  // --- 디스코드 웹후크 주소 설정 ---
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
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      setUser(u);
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single();
      setProfile(p);
      const { data: pur } = await supabase.from('purchases').select('asset_id').eq('user_id', u.id);
      setPurchasedIds(pur?.map(item => item.asset_id) || []);
      
      // [LOG] 가입 로그 (처음 로그인 시 한 번만)
      if (!localStorage.getItem(`joined_${u.id}`)) {
        sendWebhook(WEBHOOKS.JOIN, "🎉 신규 유저 가입", `**유저:** ${u.email}\n가입을 환영합니다!`, 0x00ff00);
        localStorage.setItem(`joined_${u.id}`, 'true');
      }
    }
    setLoading(false);
  }

  // --- 디스코드 웹후크 공통 전송 함수 ---
  async function sendWebhook(url, title, message, color) {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: title,
          description: message,
          color: color,
          thumbnail: { url: LOGO_URL },
          timestamp: new Date().toISOString(),
          footer: { text: "RICE STORE SECURITY SYSTEM" }
        }]
      })
    });
  }

  // --- 구매 로직 ---
  async function buyAsset(asset) {
    if (!profile || profile.balance < asset.price) return alert('잔액이 부족합니다!');
    await supabase.from('profiles').update({ balance: profile.balance - asset.price }).eq('id', user.id);
    await supabase.from('purchases').insert({ user_id: user.id, asset_id: asset.id });
    
    // [LOG] 구매 로그 전송
    sendWebhook(WEBHOOKS.BUY, "🛍️ 상품 구매 발생", `**구매자:** ${user.email}\n**상품명:** ${asset.title}\n**차감 금액:** ${asset.price}원`, 0x3498db);
    
    alert('구매가 완료되었습니다!');
    init();
  }

  // --- 충전 신청 로직 ---
  async function requestCharge(e) {
    e.preventDefault();
    const type = chargeType === 'voucher' ? '문화상품권' : '무통장입금';
    const amount = e.target.amount.value;
    const pinOrName = e.target.voucher_pin?.value || e.target.sender_name?.value;

    await supabase.from('charge_requests').insert({
      user_id: user.id, user_email: user.email,
      amount: parseInt(amount),
      voucher_pin: e.target.voucher_pin?.value || '',
      sender_name: e.target.sender_name?.value || '',
      request_type: chargeType
    });

    // [LOG] 충전 신청 로그 전송
    sendWebhook(WEBHOOKS.CHARGE, "💰 충전 신청 접수", `**신청자:** ${user.email}\n**유형:** ${type}\n**금액:** ${amount}원\n**정보:** ${pinOrName}`, 0xf1c40f);

    alert('충전 신청이 접수되었습니다.');
    setView('shop');
  }

  // --- [NEW] 상품 등록 로직 (웹후크 포함) ---
  async function handleUploadAsset(e) {
    e.preventDefault();
    if (adminInput !== ADMIN_PASS) return alert('관리자 비밀번호가 틀렸습니다.');
    
    setUploading(true);
    const form = e.target;
    const file = form.file_input.files[0];
    const fileName = `${Date.now()}_${file.name}`;

    try {
      // 1. 스토리지 업로드
      await supabase.storage.from('asset-files').upload(fileName, file);
      
      // 2. DB 저장
      const { error } = await supabase.from('assets').insert({
        title: form.title.value,
        price: parseInt(form.price.value),
        description: form.description.value,
        image_url: form.image.value,
        file_path: fileName
      });

      if (error) throw error;

      // [LOG] 상품 추가 로그 전송
      sendWebhook(WEBHOOKS.UPLOAD, "📦 신규 에셋 등록 완료", `**관리자:** ${user.email}\n**상품명:** ${form.title.value}\n**가격:** ${form.price.value}원\n**설명:** ${form.description.value}`, 0x9b59b6);

      alert('상품이 성공적으로 등록되었습니다!');
      setView('shop');
      init();
    } catch (err) {
      alert('등록 실패: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="loader">RICE STORE...</div>

  // --- 로그인 전 화면 (게이트) ---
  if (!user) return (
    <div className="gate">
      <div className="gate-card slide-up">
        <img src={LOGO_URL} className="gate-logo pulse" />
        <h1>RICE STORE</h1>
        <button onClick={() => supabase.auth.signInWithOAuth({provider:'discord'})} className="discord-btn">디스코드로 입장하기</button>
      </div>
      <style jsx>{`
        .gate { height: 100vh; background: #000; display: flex; justify-content: center; align-items: center; }
        .gate-card { background: #111; padding: 60px; border-radius: 40px; border: 1px solid #222; text-align: center; }
        .gate-logo { width: 100px; border-radius: 20px; margin-bottom: 20px; }
        .discord-btn { background: #fff; color: #000; border: none; padding: 15px 40px; border-radius: 12px; font-weight: bold; cursor: pointer; }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .slide-up { animation: slideUp 0.8s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-inner">
          <div className="logo-group" onClick={() => setView('shop')}>
            <img src={LOGO_URL} className="nav-logo" />
            <span>RICE STORE</span>
          </div>
          <div className="nav-right">
            <span className="admin-tag" onClick={() => setView('admin')}>ADMIN</span>
            <div className="user-badge">
              <span className="balance">💰 {profile?.balance?.toLocaleString()}</span>
              <button className="charge-nav-btn" onClick={() => setView('charge')}>충전</button>
              <img src={user.user_metadata.avatar_url} className="avatar" />
              <button className="logout-btn" onClick={() => supabase.auth.signOut().then(()=>window.location.reload())}>로그아웃</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="content">
        {view === 'shop' ? (
          <div className="shop-view fade-in">
            <div className="asset-grid">
              {assets.map(asset => (
                <div key={asset.id} className="asset-card">
                  <div className="card-img"><img src={asset.image_url} /></div>
                  <div className="card-body">
                    <h3>{asset.title}</h3>
                    <div className="card-footer">
                      <span className="price">{asset.price.toLocaleString()}원</span>
                      {purchasedIds.includes(asset.id) ? (
                        <button onClick={async () => {
                          const { data } = await supabase.storage.from('asset-files').createSignedUrl(asset.file_path, 60);
                          window.location.href = data.signedUrl;
                        }} className="download-btn">DOWNLOAD</button>
                      ) : (
                        <button onClick={() => buyAsset(asset)} className="buy-btn">PURCHASE</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : view === 'charge' ? (
          <div className="panel fade-in">
            <div className="glass-card">
              <h2>포인트 충전</h2>
              <div className="tabs">
                <button className={chargeType==='voucher'?'active':''} onClick={()=>setChargeType('voucher')}>문상</button>
                <button className={chargeType==='bank'?'active':''} onClick={()=>setChargeType('bank')}>무통장</button>
              </div>
              <form onSubmit={requestCharge}>
                <input name="amount" type="number" placeholder="금액" required />
                {chargeType === 'voucher' ? <input name="voucher_pin" placeholder="PIN 번호" required /> : <input name="sender_name" placeholder="입금자명" required />}
                <button type="submit" className="submit-btn">신청하기</button>
              </form>
              <button className="cancel-btn" onClick={()=>setView('shop')}>돌아가기</button>
            </div>
          </div>
        ) : (
          <div className="panel fade-in">
            <div className="glass-card">
              <h2>ADMIN PANEL</h2>
              <input type="password" placeholder="비번" onChange={e=>setAdminInput(e.target.value)} />
              {adminInput === ADMIN_PASS && (
                <form onSubmit={handleUploadAsset} className="admin-form">
                  <input name="title" placeholder="상품명" required />
                  <input name="price" type="number" placeholder="가격" required />
                  <textarea name="description" placeholder="설명" required />
                  <input name="image" placeholder="이미지 URL" required />
                  <input name="file_input" type="file" required />
                  <button type="submit" className="submit-btn" disabled={uploading}>
                    {uploading ? '업로드 중...' : '에셋 등록하기'}
                  </button>
                </form>
              )}
              <button className="cancel-btn" onClick={()=>setView('shop')}>나가기</button>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        body { margin: 0; background: #000; color: #888; font-family: sans-serif; }
        .navbar { background: #111; border-bottom: 1px solid #222; position: sticky; top: 0; z-index: 100; }
        .nav-inner { max-width: 1100px; margin: 0 auto; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; }
        .logo-group { display: flex; align-items: center; gap: 10px; cursor: pointer; color: #fff; font-weight: bold; font-size: 20px; }
        .nav-logo { width: 32px; border-radius: 8px; }
        .user-badge { display: flex; align-items: center; gap: 12px; background: #1a1a1a; padding: 5px 15px; border-radius: 30px; border: 1px solid #333; }
        .balance { color: #fff; font-weight: bold; }
        .charge-nav-btn { background: #fff; border: none; padding: 3px 10px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 11px; }
        .avatar { width: 28px; border-radius: 50%; border: 1px solid #333; }
        .logout-btn { background: none; border: none; color: #444; font-size: 11px; cursor: pointer; }
        .asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 30px; padding: 40px; max-width: 1100px; margin: 0 auto; }
        .asset-card { background: #121212; border: 1px solid #222; border-radius: 20px; overflow: hidden; transition: 0.3s; }
        .asset-card:hover { transform: translateY(-10px); border-color: #444; }
        .card-img { height: 160px; background: #1a1a1a; }
        .card-img img { width: 100%; height: 100%; object-fit: cover; }
        .card-body { padding: 20px; }
        .price { font-size: 20px; font-weight: bold; color: #fff; }
        .buy-btn { background: #fff; color: #000; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .download-btn { background: #4caf50; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .panel { display: flex; justify-content: center; padding: 60px 20px; }
        .glass-card { background: #111; padding: 40px; border-radius: 30px; border: 1px solid #222; width: 100%; max-width: 500px; }
        .tabs { display: flex; gap: 10px; margin-bottom: 20px; }
        .tabs button { flex: 1; padding: 10px; background: #1a1a1a; border: 1px solid #333; color: #555; cursor: pointer; border-radius: 10px; }
        .tabs button.active { background: #fff; color: #000; font-weight: bold; }
        input, textarea { width: 100%; padding: 12px; background: #0a0a0a; border: 1px solid #222; border-radius: 10px; color: #fff; margin-bottom: 10px; box-sizing: border-box; outline: none; }
        .submit-btn { width: 100%; background: #fff; color: #000; border: none; padding: 15px; border-radius: 10px; font-weight: bold; cursor: pointer; }
        .submit-btn:disabled { opacity: 0.5; }
        .cancel-btn { background: none; border: none; color: #444; width: 100%; margin-top: 15px; cursor: pointer; }
        .fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .loader { height: 100vh; display: flex; justify-content: center; align-items: center; color: #fff; background: #000; }
        .admin-form { display: flex; flex-direction: column; margin-top: 20px; }
      `}</style>
    </div>
  );
}
