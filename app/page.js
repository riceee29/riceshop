'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RiceStoreUltimate() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assets, setAssets] = useState([]);
  const [purchasedIds, setPurchasedIds] = useState([]); // 구매한 상품 ID 목록
  const [view, setView] = useState('shop'); 
  const [loading, setLoading] = useState(true);
  const [chargeType, setChargeType] = useState('voucher');
  const [adminInput, setAdminInput] = useState('');
  const ADMIN_PASS = '20140419ju!';

  const LOGO_URL = "https://cdn.discordapp.com/attachments/1449379705546473502/1497840261915480134/Gemini_Generated_Image_rmtwv7rmtwv7rmtw.png?ex=69eefbf2&is=69edaa72&hm=743bba23cb19d2d9392aebe794b30acda7fb3ee6d4b050b7dffd648a9eabf1c8&";

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    // 1. 상품 목록 가져오기
    const { data: assetsData } = await supabase.from('assets').select('*').order('id', { ascending: false });
    setAssets(assetsData || []);

    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      setUser(u);
      // 2. 유저 프로필(잔액) 가져오기
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single();
      setProfile(p);
      // 3. 유저가 구매한 상품 ID들 가져오기
      const { data: pur } = await supabase.from('purchases').select('asset_id').eq('user_id', u.id);
      setPurchasedIds(pur?.map(item => item.asset_id) || []);
    }
    setLoading(false);
  }

  const loginDiscord = () => supabase.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: window.location.origin } });

  // --- 구매 로직 ---
  async function buyAsset(asset) {
    if (!profile || profile.balance < asset.price) return alert('잔액이 부족합니다!');
    
    // 돈 깎기
    await supabase.from('profiles').update({ balance: profile.balance - asset.price }).eq('id', user.id);
    // 구매 내역 기록
    await supabase.from('purchases').insert({ user_id: user.id, asset_id: asset.id });
    // 구매자 수 증가
    await supabase.from('assets').update({ sales_count: (asset.sales_count || 0) + 1 }).eq('id', asset.id);

    alert(`✅ [${asset.title}] 구매 완료! 이제 다운로드 버튼이 생깁니다.`);
    init();
  }

  // --- 일회용 다운로드 주소 생성 함수 ---
  async function downloadAsset(asset) {
    if (!asset.file_path) return alert('등록된 파일이 없습니다. 관리자에게 문의하세요.');

    // Supabase Storage에서 60초 동안만 유효한 비밀 주소를 만듭니다.
    const { data, error } = await supabase.storage
      .from('asset-files') // 버킷 이름
      .createSignedUrl(asset.file_path, 60); 

    if (error) {
      alert('주소 생성 실패: ' + error.message);
    } else {
      // 비밀 주소로 새 창 열기 (다운로드 시작)
      window.location.href = data.signedUrl;
    }
  }

  async function uploadAsset(e) {
    e.preventDefault();
    if (adminInput !== ADMIN_PASS) return alert('비밀번호 틀림!');
    const form = e.target;
    await supabase.from('assets').insert({
      title: form.title.value,
      price: parseInt(form.price.value),
      description: form.description.value,
      image_url: form.image.value,
      file_path: form.file_path.value, // 파일 저장 경로 (예: sword.rbxm)
    });
    alert('등록 성공!'); setView('shop'); init();
  }

  if (loading) return <div className="loader">RICE STORE LOADING...</div>

  if (!user) return (
    <div className="gate-container">
      <div className="gate-card slide-up">
        <img src={LOGO_URL} className="gate-logo pulse" />
        <h1>RICE STORE</h1>
        <button onClick={loginDiscord} className="discord-btn">디스코드로 입장하기</button>
      </div>
      <style jsx>{`
        .gate-container { height: 100vh; background: #000; display: flex; justify-content: center; align-items: center; }
        .gate-card { text-align: center; background: #111; padding: 60px; border-radius: 40px; border: 1px solid #333; }
        .gate-logo { width: 120px; height: 120px; border-radius: 20px; margin-bottom: 20px; }
        .discord-btn { background: #fff; color: #000; border: none; padding: 15px 40px; border-radius: 12px; font-weight: 900; cursor: pointer; transition: 0.3s; }
        .discord-btn:hover { background: #8ec5fc; transform: scale(1.1); }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
        .slide-up { animation: slideUp 1s ease-out; }
        @keyframes slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );

  return (
    <div className="black-theme">
      <nav className="navbar">
        <div className="nav-inner">
          <div className="logo-group" onClick={() => setView('shop')}>
            <img src={LOGO_URL} className="nav-logo" />
            <span>RICE STORE</span>
          </div>
          <div className="nav-right">
            <span className="admin-trigger" onClick={() => setView('admin')}>ADMIN</span>
            <div className="user-badge">
              <span className="balance">💰 {profile?.balance?.toLocaleString()}원</span>
              <button className="charge-nav-btn" onClick={() => setView('charge')}>충전</button>
              <img src={user.user_metadata.avatar_url} className="avatar" />
              <button className="logout-btn" onClick={() => supabase.auth.signOut().then(()=>window.location.reload())}>로그아웃</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="main-content">
        {view === 'shop' ? (
          <div className="shop-view fade-in">
            <div className="asset-grid">
              {assets.map(asset => {
                const isBought = purchasedIds.includes(asset.id);
                return (
                  <div key={asset.id} className="asset-card">
                    <div className="card-img"><img src={asset.image_url} /></div>
                    <div className="card-body">
                      <span className="sales-tag">구매 {asset.sales_count || 0}건</span>
                      <h3>{asset.title}</h3>
                      <p>{asset.description}</p>
                      <div className="card-footer">
                        <span className="price">{asset.price.toLocaleString()}원</span>
                        {isBought ? (
                          <button onClick={() => downloadAsset(asset)} className="download-btn">DOWNLOAD</button>
                        ) : (
                          <button onClick={() => buyAsset(asset)} className="buy-btn">PURCHASE</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : view === 'charge' ? (
          <div className="admin-panel fade-in">
            <div className="glass-card">
              <h2>포인트 충전</h2>
              <div className="tabs">
                <button className={chargeType==='voucher'?'active':''} onClick={()=>setChargeType('voucher')}>문화상품권</button>
                <button className={chargeType==='bank'?'active':''} onClick={()=>setChargeType('bank')}>무통장입금</button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                supabase.from('charge_requests').insert({
                  user_id: user.id, user_email: user.email,
                  amount: parseInt(e.target.amount.value),
                  sender_name: e.target.sender_name?.value || '',
                  voucher_pin: e.target.voucher_pin?.value || '',
                  request_type: chargeType
                }).then(() => { alert('신청 완료!'); setView('shop'); });
              }}>
                {chargeType === 'voucher' ? (
                  <>
                    <input name="voucher_pin" placeholder="PIN 번호" required />
                    <input name="amount" type="number" placeholder="금액" required />
                  </>
                ) : (
                  <>
                    <div className="bank-box">🏦 OO은행 123-456-7890</div>
                    <input name="amount" type="number" placeholder="입금액" required />
                    <input name="sender_name" placeholder="입금자명" required />
                  </>
                )}
                <button type="submit" className="submit-btn">충전 신청</button>
              </form>
              <button className="cancel-btn" onClick={()=>setView('shop')}>돌아가기</button>
            </div>
          </div>
        ) : (
          <div className="admin-panel fade-in">
            <div className="glass-card" style={{maxWidth:'600px'}}>
              <h2>ADMIN PANEL</h2>
              <input type="password" placeholder="비밀번호" onChange={e=>setAdminInput(e.target.value)} />
              {adminInput === ADMIN_PASS && (
                <div className="admin-tabs">
                  <form onSubmit={uploadAsset}>
                    <input name="title" placeholder="상품명" required />
                    <input name="price" type="number" placeholder="가격" required />
                    <textarea name="description" placeholder="설명" required />
                    <input name="image" placeholder="이미지 URL" required />
                    <input name="file_path" placeholder="파일 경로 (예: sword.rbxm)" required />
                    <button type="submit" className="submit-btn">에셋 업로드</button>
                  </form>
                </div>
              )}
              <button className="cancel-btn" onClick={()=>setView('shop')}>나가기</button>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        body { margin: 0; background: #000; color: #bbb; font-family: sans-serif; }
        .navbar { background: #111; border-bottom: 1px solid #222; position: sticky; top: 0; z-index: 100; }
        .nav-inner { max-width: 1100px; margin: 0 auto; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; }
        .logo-group { display: flex; align-items: center; gap: 12px; cursor: pointer; color: #fff; font-weight: bold; }
        .nav-logo { width: 36px; height: 36px; border-radius: 8px; }
        .user-badge { display: flex; align-items: center; gap: 15px; background: #1a1a1a; padding: 5px 15px; border-radius: 30px; border: 1px solid #333; }
        .balance { font-weight: bold; color: #fff; }
        .charge-nav-btn { background: #fff; border: none; padding: 4px 12px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 11px; }
        .avatar { width: 28px; border-radius: 50%; border: 2px solid #333; }
        .logout-btn { background: none; border: none; color: #555; cursor: pointer; font-size: 11px; }

        .asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 35px; max-width: 1100px; margin: 0 auto; padding: 40px 20px; }
        .asset-card { background: #121212; border: 1px solid #222; border-radius: 20px; overflow: hidden; transition: 0.3s; }
        .asset-card:hover { transform: translateY(-10px); border-color: #555; }
        .card-img { height: 200px; background: #1a1a1a; }
        .card-img img { width: 100%; height: 100%; object-fit: cover; }
        .card-body { padding: 25px; position: relative; }
        .sales-tag { position: absolute; top: -160px; left: 15px; background: rgba(0,0,0,0.7); color: #fff; padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: bold; }
        .card-body h3 { color: #fff; margin: 0 0 10px 0; font-size: 20px; }
        .card-body p { color: #666; font-size: 14px; height: 40px; overflow: hidden; }
        .card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 25px; }
        .price { font-size: 24px; font-weight: bold; color: #fff; }
        
        .buy-btn { background: #fff; color: #000; border: none; padding: 12px 25px; border-radius: 12px; font-weight: bold; cursor: pointer; }
        .download-btn { background: #4caf50; color: #fff; border: none; padding: 12px 25px; border-radius: 12px; font-weight: bold; cursor: pointer; }

        .admin-panel { display: flex; justify-content: center; padding: 80px 20px; }
        .glass-card { background: #111; padding: 45px; border-radius: 30px; border: 1px solid #222; width: 100%; max-width: 480px; }
        .tabs { display: flex; gap: 12px; margin-bottom: 30px; }
        .tabs button { flex: 1; padding: 12px; background: #1a1a1a; border: 1px solid #333; color: #555; cursor: pointer; border-radius: 10px; }
        .tabs button.active { background: #fff; color: #000; font-weight: bold; }
        input, textarea { width: 100%; padding: 15px; background: #0a0a0a; border: 1px solid #222; border-radius: 12px; color: #fff; margin-bottom: 15px; box-sizing: border-box; outline: none; }
        .submit-btn { width: 100%; background: #fff; color: #000; border: none; padding: 18px; border-radius: 12px; font-weight: bold; cursor: pointer; }
        .cancel-btn { background: none; border: none; color: #444; width: 100%; margin-top: 15px; cursor: pointer; }

        .fade-in { animation: fadeIn 0.8s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .loader { height: 100vh; display: flex; justify-content: center; align-items: center; color: #fff; font-weight: bold; background: #000; }
      `}</style>
    </div>
  );
}
