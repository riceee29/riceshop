'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RiceSkyV2() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assets, setAssets] = useState([]);
  const [view, setView] = useState('shop'); 
  const ADMIN_PASS = '20140419ju!';

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: assetsData } = await supabase.from('assets').select('*').order('id', { ascending: false });
    setAssets(assetsData || []);
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      setUser(u);
      const { data } = await supabase.from('profiles').select('*').eq('id', u.id).single();
      setProfile(data);
    }
  }

  // --- 디스코드 로그인 함수 ---
  async function loginWithDiscord() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.origin }
    });
    if (error) alert("디스코드 로그인 에러: " + error.message);
  }

  async function buyAsset(asset) {
    if (!user) return alert('로그인이 필요합니다.');
    if (!profile || profile.balance < asset.price) return alert('잔액이 부족합니다.');
    
    const { error } = await supabase.from('profiles').update({ balance: profile.balance - asset.price }).eq('id', user.id);
    if (!error) {
      alert(`✨ ${asset.title} 구매 성공! 하늘 저장소에서 확인하세요.`);
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
      image_url: form.image.value || 'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?fit=crop&w=500',
    });
    alert('상품 등록 성공!'); setView('shop'); init();
  }

  return (
    <div className="sky-container">
      {/* 배경 애니메이션 요소 */}
      <div className="stars"></div>
      <div className="clouds"></div>

      {/* 헤더 */}
      <nav className="glass-nav">
        <h1 className="logo" onClick={() => setView('shop')}>🍚 RICE STORE</h1>
        <div className="nav-links">
          <span onClick={() => setView('admin')} className="admin-btn">관리자</span>
          {user ? (
            <div className="user-info">
              <span className="balance">💰 {profile?.balance?.toLocaleString()}</span>
              <img src={user.user_metadata.avatar_url} className="avatar" />
              <button onClick={() => supabase.auth.signOut().then(()=>window.location.reload())} className="btn-logout">로그아웃</button>
            </div>
          ) : (
            <button onClick={loginWithDiscord} className="btn-discord">
              <img src="https://assets-global.website-files.com/6257adef93467e42288db750/6257adef93467e6d518db777_32px-Discord-Logo.svg.png" width="20" />
              디스코드 로그인
            </button>
          )}
        </div>
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="content">
        {view === 'shop' ? (
          <>
            <section className="hero">
              <h2 className="fade-in">Dreamy Roblox Assets</h2>
              <p className="slide-up">당신의 상상력을 현실로 만드는 하늘의 조각들</p>
            </section>

            <div className="asset-grid">
              {assets.map(asset => (
                <div key={asset.id} className="asset-card">
                  <div className="img-container">
                    <img src={asset.image_url} alt={asset.title} />
                  </div>
                  <div className="card-body">
                    <h3>{asset.title}</h3>
                    <p>{asset.description}</p>
                    <div className="card-footer">
                      <span className="price">{asset.price.toLocaleString()}원</span>
                      <button onClick={() => buyAsset(asset)} className="btn-buy">구매</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="admin-panel glass">
            <h2>관리자 업로드</h2>
            <form onSubmit={uploadAsset} className="admin-form">
              <input name="title" placeholder="상품 이름" required />
              <input name="price" type="number" placeholder="가격" required />
              <textarea name="description" placeholder="설명" required />
              <input name="image" placeholder="이미지 URL" />
              <input type="password" placeholder="비밀번호" onChange={e => setAdminInput(e.target.value)} required />
              <button type="submit">천상계로 등록</button>
            </form>
            <button onClick={() => setView('shop')} className="btn-back">상점으로 돌아가기</button>
          </div>
        )}
      </main>

      <style jsx>{`
        .sky-container {
          min-height: 100vh;
          background: linear-gradient(180deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
          color: white;
          font-family: 'Pretendard', sans-serif;
          overflow-x: hidden;
          position: relative;
        }

        /* 별 반짝임 애니메이션 */
        .stars {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: url('https://www.transparenttextures.com/patterns/stardust.png');
          animation: twinkle 10s infinite linear;
          opacity: 0.5;
        }

        @keyframes twinkle {
          from { background-position: 0 0; }
          to { background-position: -1000px 1000px; }
        }

        .glass-nav {
          display: flex; justifyContent: space-between; alignItems: center;
          padding: 20px 80px; position: sticky; top: 0; z-index: 100;
          background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(15px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .logo { font-size: 24px; font-weight: 900; cursor: pointer; color: #8ec5fc; text-shadow: 0 0 10px #8ec5fc; }

        .btn-discord {
          background: #5865F2; color: white; border: none; padding: 10px 20px;
          border-radius: 12px; display: flex; alignItems: center; gap: 10px;
          font-weight: bold; cursor: pointer; transition: 0.3s;
        }
        .btn-discord:hover { transform: scale(1.05); box-shadow: 0 0 20px rgba(88, 101, 242, 0.5); }

        .hero { text-align: center; padding: 80px 20px; }
        .hero h2 { font-size: 60px; margin-bottom: 10px; background: linear-gradient(to right, #fff, #8ec5fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

        .asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 40px; padding: 0 80px 80px; }

        .asset-card {
          background: rgba(255, 255, 255, 0.05); border-radius: 25px; border: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden; transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .asset-card:hover { transform: translateY(-15px) rotate(2deg); background: rgba(255, 255, 255, 0.1); border-color: #8ec5fc; }

        .img-container { height: 200px; overflow: hidden; }
        .img-container img { width: 100%; height: 100%; object-fit: cover; }

        .card-body { padding: 25px; }
        .price { font-size: 24px; font-weight: 900; color: #8ec5fc; }

        .btn-buy {
          background: white; color: #2c5364; border: none; padding: 10px 20px;
          border-radius: 10px; fontWeight: bold; cursor: pointer; transition: 0.3s;
        }
        .btn-buy:hover { background: #8ec5fc; color: white; }

        .admin-panel { max-width: 500px; margin: 100px auto; padding: 40px; border-radius: 30px; }
        .admin-form { display: flex; flexDirection: column; gap: 15px; }
        .admin-form input, .admin-form textarea {
          background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 15px; border-radius: 12px; color: white; outline: none;
        }

        .avatar { width: 35px; height: 35px; border-radius: 50%; border: 2px solid #8ec5fc; }

        /* 애니메이션 효과들 */
        .fade-in { animation: fadeIn 1.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .slide-up { animation: slideUp 1s ease-out; }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  )
}
