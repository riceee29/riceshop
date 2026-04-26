'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RiceGateShop() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      setUser(u);
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single();
      setProfile(p);
      const { data: a } = await supabase.from('assets').select('*').order('id', { ascending: false });
      setAssets(a || []);
    }
    setLoading(false);
  }

  async function loginDiscord() {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.origin }
    });
  }

  if (loading) return <div className="loading">하늘로 가는 중...</div>

  // --- 로그인 전 화면 (로그인 전용 창) ---
  if (!user) {
    return (
      <div className="login-gate">
        <div className="stars"></div>
        <div className="floating-circle"></div>
        <div className="login-card fade-in">
          <h1 className="title">🍚 RICE STORE</h1>
          <p className="subtitle">하늘의 조각들을 얻으려면 디스코드 로그인이 필요합니다.</p>
          <button onClick={loginDiscord} className="discord-main-btn">
            <img src="https://assets-global.website-files.com/6257adef93467e42288db750/6257adef93467e6d518db777_32px-Discord-Logo.svg.png" width="24" />
            디스코드로 입장하기
          </button>
        </div>
        <style jsx>{`
          .login-gate { height: 100vh; background: #0b0e14; display: flex; justify-content: center; align-items: center; overflow: hidden; position: relative; }
          .stars { position: absolute; width: 200%; height: 200%; background: url('https://www.transparenttextures.com/patterns/stardust.png'); animation: rotate 100s linear infinite; opacity: 0.3; }
          .floating-circle { position: absolute; width: 400px; height: 400px; background: radial-gradient(circle, rgba(142,197,252,0.2) 0%, transparent 70%); border-radius: 50%; animation: pulse 8s infinite; }
          .login-card { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(20px); padding: 50px; border-radius: 40px; border: 1px solid rgba(255, 255, 255, 0.1); text-align: center; z-index: 10; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
          .title { font-size: 40px; font-weight: 900; color: #8ec5fc; margin-bottom: 10px; text-shadow: 0 0 20px rgba(142,197,252,0.5); }
          .discord-main-btn { background: #5865F2; color: white; border: none; padding: 15px 40px; border-radius: 15px; font-size: 18px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 15px; margin-top: 30px; transition: 0.3s; width: 100%; justify-content: center; }
          .discord-main-btn:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(88,101,242,0.4); }
          @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes pulse { 0% { transform: scale(1); opacity: 0.2; } 50% { transform: scale(1.2); opacity: 0.4; } 100% { transform: scale(1); opacity: 0.2; } }
          .fade-in { animation: fadeIn 2s ease-out; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    );
  }

  // --- 로그인 후 화면 (기존 상점) ---
  return (
    <div className="shop-bg">
      <nav className="glass-nav">
        <h2>🍚 RICE STORE</h2>
        <div className="nav-info">
          <span>💰 {profile?.balance?.toLocaleString()}원</span>
          <img src={user.user_metadata.avatar_url} className="avatar" />
          <button onClick={() => supabase.auth.signOut().then(()=>window.location.reload())}>로그아웃</button>
        </div>
      </nav>

      <div className="shop-content">
        <div className="grid">
          {assets.map(asset => (
            <div key={asset.id} className="asset-card">
              <img src={asset.image_url} />
              <div className="p-4">
                <h3>{asset.title}</h3>
                <p>{asset.price}원</p>
                <button className="buy-btn">구매하기</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .shop-bg { min-height: 100vh; background: #0f172a; color: white; }
        .glass-nav { display: flex; justify-content: space-between; padding: 20px 50px; background: rgba(0,0,0,0.3); backdrop-filter: blur(10px); }
        .avatar { width: 35px; border-radius: 50%; margin: 0 15px; border: 2px solid #8ec5fc; }
        .shop-content { padding: 50px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 30px; }
        .asset-card { background: rgba(255,255,255,0.05); border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); transition: 0.3s; }
        .asset-card:hover { transform: scale(1.05); border-color: #8ec5fc; }
        .asset-card img { width: 100%; height: 180px; object-fit: cover; }
        .p-4 { padding: 20px; }
        .buy-btn { width: 100%; padding: 10px; background: #8ec5fc; border: none; border-radius: 10px; color: #000; font-weight: bold; cursor: pointer; }
      `}</style>
    </div>
  )
}
