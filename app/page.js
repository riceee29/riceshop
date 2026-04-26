'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PremiumSkyStore() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assets, setAssets] = useState([]);
  const [view, setView] = useState('shop'); 
  const [loading, setLoading] = useState(true);
  const ADMIN_PASS = '20140419ju!';

  useEffect(() => {
    init();
  }, []);

  async function init() {
    setLoading(true);
    const { data: assetsData } = await supabase.from('assets').select('*').order('id', { ascending: false });
    setAssets(assetsData || []);
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      setUser(u);
      const { data } = await supabase.from('profiles').select('*').eq('id', u.id).single();
      setProfile(data);
    }
    setLoading(false);
  }

  async function loginDiscord() {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.origin }
    });
  }

  async function buyAsset(asset) {
    if (!user) return alert('먼저 하늘에 입장(로그인)해주세요!');
    if (!profile || profile.balance < asset.price) return alert('은하수 잔액이 부족합니다. 충전 후 이용해주세요!');
    
    const { error } = await supabase.from('profiles').update({ balance: profile.balance - asset.price }).eq('id', user.id);
    if (!error) {
      alert(`✨ [${asset.title}] 구매 완료! 당신의 창고에 보관되었습니다.`);
      init();
    }
  }

  const [adminInput, setAdminInput] = useState('');
  async function uploadAsset(e) {
    e.preventDefault();
    if (adminInput !== ADMIN_PASS) return alert('비밀번호가 틀렸습니다!');
    const form = e.target;
    await supabase.from('assets').insert({
      title: form.title.value,
      price: parseInt(form.price.value),
      description: form.description.value,
      image_url: form.image.value || 'https://images.unsplash.com/photo-1536431311719-398b6704d4cc?auto=format&fit=crop&w=800',
    });
    alert('새로운 에셋이 밤하늘에 등록되었습니다!'); setView('shop'); init();
  }

  if (loading) return (
    <div className="loader-container">
      <div className="loader"></div>
      <p>은하수 데이터를 불러오는 중...</p>
      <style jsx>{`
        .loader-container { height: 100vh; background: #050a14; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #8ec5fc; }
        .loader { width: 50px; height: 50px; border: 5px solid #1a2a44; border-top: 5px solid #8ec5fc; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );

  return (
    <div className="sky-theme">
      {/* 배경 레이어 */}
      <div className="stars"></div>
      <div className="twinkle"></div>
      <div className="shooting-star"></div>

      {/* 네비게이션 */}
      <nav className="nav-premium">
        <div className="nav-content">
          <h1 className="logo-glow" onClick={() => setView('shop')}>RICE STORE</h1>
          <div className="nav-right">
            <span onClick={() => setView('admin')} className="admin-trigger">ADMIN</span>
            {user ? (
              <div className="profile-badge">
                <div className="balance-info">
                  <span className="label">BALANCE</span>
                  <span className="val">💰 {profile?.balance?.toLocaleString()}</span>
                </div>
                <img src={user.user_metadata.avatar_url} className="user-avatar" alt="pfp" />
                <button onClick={() => supabase.auth.signOut().then(()=>window.location.reload())} className="logout-icon">✕</button>
              </div>
            ) : (
              <button onClick={loginDiscord} className="discord-premium-btn">
                <img src="https://assets-global.website-files.com/6257adef93467e42288db750/6257adef93467e6d518db777_32px-Discord-Logo.svg.png" width="18" />
                DISCORD LOGIN
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="main-viewport">
        {view === 'shop' ? (
          <>
            {!user && (
              <section className="login-gate fade-in">
                <div className="gate-card">
                  <h2>WELCOME TO RICE STORE</h2>
                  <p>로그인하여 프리미엄 로블록스 에셋을 확인하세요.</p>
                  <button onClick={loginDiscord} className="btn-huge">START WITH DISCORD</button>
                </div>
              </section>
            )}

            {user && (
              <div className="shop-layout fade-in">
                <header className="shop-header">
                  <h2 className="section-title">Sky-High Assets</h2>
                  <p className="section-desc">최고의 퀄리티, 오직 당신만을 위한 에셋 상점</p>
                </header>

                <div className="asset-grid">
                  {assets.map(asset => (
                    <div key={asset.id} className="premium-card">
                      <div className="card-image">
                        <img src={asset.image_url} alt="asset" />
                        <div className="image-overlay"></div>
                        <span className="category-badge">PREMIUM</span>
                      </div>
                      <div className="card-details">
                        <h3>{asset.title}</h3>
                        <p className="desc">{asset.description}</p>
                        <div className="price-row">
                          <span className="price-tag">{asset.price.toLocaleString()} <small>원</small></span>
                          <button onClick={() => buyAsset(asset)} className="buy-action">PURCHASE</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="admin-container fade-in">
            <div className="admin-glass-card">
              <div className="admin-header">
                <h2>UPLOAD ASSET</h2>
                <p>밤하늘에 새로운 조각을 추가합니다.</p>
              </div>
              <form onSubmit={uploadAsset} className="premium-form">
                <div className="input-group">
                  <label>ITEM NAME</label>
                  <input name="title" placeholder="상품 이름을 입력하세요" required />
                </div>
                <div className="input-group">
                  <label>PRICE (KRW)</label>
                  <input name="price" type="number" placeholder="가격을 설정하세요" required />
                </div>
                <div className="input-group">
                  <label>DESCRIPTION</label>
                  <textarea name="description" placeholder="상품에 대한 설명을 적어주세요" required />
                </div>
                <div className="input-group">
                  <label>IMAGE URL</label>
                  <input name="image" placeholder="이미지 링크를 넣어주세요" />
                </div>
                <div className="input-group">
                  <label>ADMIN ACCESS CODE</label>
                  <input type="password" placeholder="비밀번호" onChange={e => setAdminInput(e.target.value)} required />
                </div>
                <button type="submit" className="upload-submit">REGISTER ITEM</button>
              </form>
              <button onClick={() => setView('shop')} className="btn-cancel">CANCEL</button>
            </div>
          </div>
        )}
      </main>

      <footer className="sky-footer">
        <p>&copy; 2024 RICE ASSET STORE. ALL RIGHTS RESERVED.</p>
      </footer>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;500;700&display=swap');

        body { margin: 0; padding: 0; background: #050a14; overflow-x: hidden; font-family: 'Space Grotesk', sans-serif; color: #fff; }
        
        /* 애니메이션 배경 */
        .sky-theme { position: relative; min-height: 100vh; background: radial-gradient(circle at top, #1a2a44 0%, #050a14 100%); }
        .stars { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: url('https://www.transparenttextures.com/patterns/stardust.png'); opacity: 0.4; pointer-events: none; }
        .twinkle { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: transparent; animation: twinkle-anim 5s infinite alternate; pointer-events: none; }
        @keyframes twinkle-anim { 0% { opacity: 0.3; } 100% { opacity: 0.7; } }

        /* 네비게이션 */
        .nav-premium { position: sticky; top: 0; z-index: 1000; background: rgba(5, 10, 20, 0.7); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(142, 197, 252, 0.1); }
        .nav-content { max-width: 1200px; margin: 0 auto; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; }
        .logo-glow { font-size: 24px; font-weight: 700; letter-spacing: 4px; color: #fff; cursor: pointer; text-shadow: 0 0 15px rgba(142,197,252,0.8); }
        .admin-trigger { font-size: 11px; color: rgba(255,255,255,0.3); cursor: pointer; margin-right: 20px; transition: 0.3s; }
        .admin-trigger:hover { color: #8ec5fc; }

        /* 프로필 배지 */
        .profile-badge { display: flex; align-items: center; background: rgba(255,255,255,0.05); border-radius: 40px; padding: 5px 15px; border: 1px solid rgba(255,255,255,0.1); }
        .balance-info { display: flex; flex-direction: column; margin-right: 15px; }
        .balance-info .label { font-size: 8px; color: #8ec5fc; letter-spacing: 1px; }
        .balance-info .val { font-size: 14px; font-weight: 700; }
        .user-avatar { width: 32px; height: 32px; border-radius: 50%; border: 2px solid #8ec5fc; }
        .logout-icon { background: none; border: none; color: #ff4d4d; margin-left: 10px; cursor: pointer; font-size: 18px; }

        /* 로그인 게이트 */
        .login-gate { height: 80vh; display: flex; justify-content: center; align-items: center; }
        .gate-card { text-align: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); padding: 60px; border-radius: 40px; backdrop-filter: blur(30px); }
        .btn-huge { background: #fff; color: #000; border: none; padding: 20px 40px; border-radius: 15px; font-weight: 700; font-size: 18px; cursor: pointer; transition: 0.3s; margin-top: 30px; }
        .btn-huge:hover { transform: scale(1.05); box-shadow: 0 0 30px rgba(255,255,255,0.2); }

        /* 상점 레이아웃 */
        .shop-layout { max-width: 1200px; margin: 0 auto; padding: 50px 30px; }
        .shop-header { text-align: center; marginBottom: 60px; }
        .section-title { font-size: 48px; margin: 0; background: linear-gradient(to bottom, #fff, #8ec5fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .section-desc { color: rgba(255,255,255,0.5); font-size: 18px; }

        /* 프리미엄 카드 */
        .asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 40px; }
        .premium-card { background: rgba(255,255,255,0.03); border-radius: 30px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden; transition: 0.4s cubic-bezier(0.2, 1, 0.3, 1); }
        .premium-card:hover { transform: translateY(-10px); border-color: rgba(142, 197, 252, 0.4); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
        .card-image { position: relative; height: 240px; overflow: hidden; }
        .card-image img { width: 100%; height: 100%; object-fit: cover; transition: 0.5s; }
        .premium-card:hover .card-image img { transform: scale(1.1); }
        .category-badge { position: absolute; top: 20px; left: 20px; background: rgba(0,0,0,0.6); backdrop-filter: blur(10px); padding: 5px 12px; border-radius: 10px; font-size: 10px; font-weight: 700; border: 1px solid rgba(255,255,255,0.1); }
        
        .card-details { padding: 30px; }
        .card-details h3 { font-size: 24px; margin: 0 0 10px 0; }
        .card-details .desc { color: rgba(255,255,255,0.5); font-size: 14px; margin-bottom: 25px; height: 42px; overflow: hidden; }
        .price-row { display: flex; justify-content: space-between; align-items: center; }
        .price-tag { font-size: 28px; font-weight: 700; color: #8ec5fc; }
        .price-tag small { font-size: 14px; color: rgba(255,255,255,0.3); }
        .buy-action { background: #8ec5fc; color: #050a14; border: none; padding: 12px 25px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.3s; }
        .buy-action:hover { transform: scale(1.05); background: #fff; }

        /* 관리자 패널 */
        .admin-glass-card { max-width: 600px; margin: 100px auto; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); padding: 50px; border-radius: 40px; backdrop-filter: blur(30px); }
        .premium-form { display: flex; flex-direction: column; gap: 20px; margin-top: 30px; }
        .input-group { display: flex; flex-direction: column; gap: 8px; }
        .input-group label { font-size: 11px; color: #8ec5fc; font-weight: 700; }
        .input-group input, .input-group textarea { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 15px; border-radius: 12px; color: #fff; outline: none; }
        .upload-submit { background: #8ec5fc; color: #000; border: none; padding: 20px; border-radius: 15px; font-weight: 700; cursor: pointer; margin-top: 10px; }
        .btn-cancel { background: none; border: none; color: rgba(255,255,255,0.3); width: 100%; margin-top: 15px; cursor: pointer; }

        /* 페이드인 애니메이션 */
        .fade-in { animation: fadeIn 1s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .sky-footer { text-align: center; padding: 100px 0 50px 0; color: rgba(255,255,255,0.2); font-size: 12px; letter-spacing: 2px; }

        .discord-premium-btn { background: #5865F2; color: white; border: none; padding: 10px 20px; border-radius: 12px; display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 13px; cursor: pointer; transition: 0.3s; }
        .discord-premium-btn:hover { box-shadow: 0 0 20px rgba(88,101,242,0.4); transform: scale(1.05); }
      `}</style>
    </div>
  )
}
