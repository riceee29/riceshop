'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SkyRiceShop() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assets, setAssets] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState('shop'); 

  // 관리자 비밀번호 설정
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

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("로그인 실패: " + error.message);
    else window.location.reload();
  }

  async function handleSignUp() {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert("회원가입 실패: " + error.message);
    else alert("가입 이메일을 확인해주세요!");
  }

  async function buyAsset(asset) {
    if (!user) return alert('로그인이 필요합니다.');
    if (!profile || profile.balance < asset.price) return alert('잔액이 부족합니다.');
    
    const { error } = await supabase.from('profiles').update({ balance: profile.balance - asset.price }).eq('id', user.id);
    if (!error) {
      alert(`🌤️ ${asset.title} 구매 성공!`);
      init();
    }
  }

  const [adminInput, setAdminInput] = useState('');
  async function uploadAsset(e) {
    e.preventDefault();
    if (adminInput !== ADMIN_PASS) return alert('관리자 비밀번호가 틀렸습니다.');
    
    const form = e.target;
    const { error } = await supabase.from('assets').insert({
      title: form.title.value,
      price: parseInt(form.price.value),
      description: form.description.value,
      image_url: form.image.value || 'https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?auto=format&fit=crop&w=500',
    });
    if (!error) { alert('상품 등록 완료!'); setView('shop'); init(); }
  }

  return (
    <div style={styles.container}>
      {/* 애니메이션용 배경 구름 */}
      <div style={styles.cloud1}></div>
      <div style={styles.cloud2}></div>

      {/* 헤더 */}
      <nav style={styles.nav}>
        <h1 style={styles.logo} onClick={() => setView('shop')}>☁️ RICE ASSET STORE</h1>
        <div style={styles.navRight}>
          <span onClick={() => setView('admin')} style={styles.adminLink}>ADMIN</span>
          {user ? (
            <div style={styles.userInfo}>
              <span style={styles.balance}>💰 {profile?.balance?.toLocaleString()}원</span>
              <button onClick={() => supabase.auth.signOut().then(()=>window.location.reload())} style={styles.logoutBtn}>로그아웃</button>
            </div>
          ) : (
            <div style={styles.authGroup}>
              <input placeholder="이메일" onChange={e => setEmail(e.target.value)} style={styles.inputSmall} />
              <input type="password" placeholder="비번" onChange={e => setPassword(e.target.value)} style={styles.inputSmall} />
              <button onClick={handleLogin} style={styles.loginBtn}>로그인</button>
              <button onClick={handleSignUp} style={styles.signupBtn}>가입</button>
            </div>
          )}
        </div>
      </nav>

      {/* 메인 섹션 */}
      {view === 'shop' ? (
        <div style={styles.main}>
          <div style={styles.hero}>
            <h2 style={styles.heroTitle}>하늘 위에서 찾은 고퀄리티 에셋</h2>
            <p style={styles.heroSub}>라이스 스토어에서 당신의 로블록스 세계를 완성하세요.</p>
          </div>

          <div style={styles.grid}>
            {assets.map(asset => (
              <div key={asset.id} style={styles.card}>
                <div style={styles.imgWrapper}>
                  <img src={asset.image_url} alt={asset.title} style={styles.cardImg} />
                </div>
                <div style={styles.cardContent}>
                  <h3 style={styles.cardTitle}>{asset.title}</h3>
                  <p style={styles.cardDesc}>{asset.description}</p>
                  <div style={styles.cardFooter}>
                    <span style={styles.priceTag}>{asset.price.toLocaleString()}원</span>
                    <button onClick={() => buyAsset(asset)} style={styles.buyBtn}>구매하기</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={styles.adminBox}>
          <h2 style={{color: '#4a90e2', textAlign: 'center'}}>ADMIN UPLOAD</h2>
          <form onSubmit={uploadAsset} style={styles.form}>
            <input name="title" placeholder="상품 이름" style={styles.formInput} required />
            <input name="price" type="number" placeholder="가격" style={styles.formInput} required />
            <textarea name="description" placeholder="상품 상세 설명" style={styles.formTextarea} required />
            <input name="image" placeholder="이미지 주소(URL)" style={styles.formInput} />
            <input type="password" placeholder="관리자 비밀번호" onChange={e => setAdminInput(e.target.value)} style={styles.formInput} required />
            <button type="submit" style={styles.formBtn}>하늘 상점에 등록하기</button>
          </form>
          <button onClick={() => setView('shop')} style={styles.backBtn}>뒤로가기</button>
        </div>
      )}

      {/* 하단 리뷰 섹션 맛보기 */}
      {view === 'shop' && (
        <footer style={styles.footer}>
          <p>⭐️ 실시간 구매평: "배송도 빠르고 에셋 퀄리티가 미쳤어요!" - rice_lover</p>
        </footer>
      )}

      <style jsx global>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        @keyframes moveClouds {
          from { left: -500px; }
          to { left: 100%; }
        }
      `}</style>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#e3f2fd', // 연한 하늘색
    backgroundImage: 'linear-gradient(to bottom, #bbdefb, #e3f2fd)',
    fontFamily: '"Pretendard", sans-serif',
    position: 'relative',
    overflowX: 'hidden'
  },
  cloud1: {
    position: 'absolute', width: '300px', height: '100px', background: 'white', borderRadius: '100px',
    top: '150px', opacity: 0.6, filter: 'blur(30px)', animation: 'moveClouds 60s linear infinite'
  },
  cloud2: {
    position: 'absolute', width: '400px', height: '120px', background: 'white', borderRadius: '100px',
    top: '400px', opacity: 0.4, filter: 'blur(40px)', animation: 'moveClouds 90s linear infinite reverse'
  },
  nav: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 60px', backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100,
    boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
  },
  logo: { fontSize: '22px', fontWeight: '900', color: '#4a90e2', cursor: 'pointer', letterSpacing: '1px' },
  navRight: { display: 'flex', gap: '25px', alignItems: 'center' },
  adminLink: { fontSize: '12px', color: '#90caf9', cursor: 'pointer', fontWeight: 'bold' },
  userInfo: { display: 'flex', gap: '15px', alignItems: 'center' },
  balance: { fontWeight: '800', color: '#1e88e5', backgroundColor: '#fff', padding: '5px 15px', borderRadius: '20px' },
  logoutBtn: { border: 'none', background: '#90caf9', color: 'white', padding: '5px 12px', borderRadius: '5px', cursor: 'pointer' },
  authGroup: { display: 'flex', gap: '8px' },
  inputSmall: { padding: '8px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '13px', outline: 'none' },
  loginBtn: { background: '#4a90e2', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' },
  signupBtn: { background: '#fff', color: '#4a90e2', border: '1px solid #4a90e2', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' },
  main: { padding: '40px 60px', position: 'relative', zIndex: 1 },
  hero: { textAlign: 'center', marginBottom: '60px', animation: 'float 4s ease-in-out infinite' },
  heroTitle: { fontSize: '48px', color: '#1565c0', marginBottom: '10px' },
  heroSub: { fontSize: '18px', color: '#546e7a' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '35px' },
  card: { 
    backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '25px', overflow: 'hidden',
    transition: 'transform 0.3s ease, boxShadow 0.3s ease', cursor: 'default',
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
  },
  imgWrapper: { overflow: 'hidden', height: '220px' },
  cardImg: { width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' },
  cardContent: { padding: '25px' },
  cardTitle: { fontSize: '20px', fontWeight: 'bold', marginBottom: '10px', color: '#333' },
  cardDesc: { color: '#78909c', fontSize: '14px', height: '42px', marginBottom: '20px' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  priceTag: { fontSize: '24px', fontWeight: '900', color: '#4a90e2' },
  buyBtn: { backgroundColor: '#4a90e2', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' },
  adminBox: { maxWidth: '500px', margin: '100px auto', backgroundColor: 'white', padding: '40px', borderRadius: '30px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' },
  formInput: { padding: '15px', borderRadius: '12px', border: '1px solid #eee', backgroundColor: '#f9f9f9', outline: 'none' },
  formTextarea: { padding: '15px', borderRadius: '12px', border: '1px solid #eee', backgroundColor: '#f9f9f9', outline: 'none', height: '100px', resize: 'none' },
  formBtn: { padding: '18px', backgroundColor: '#4a90e2', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' },
  backBtn: { width: '100%', marginTop: '10px', background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' },
  footer: { textAlign: 'center', padding: '40px', color: '#1565c0', fontWeight: 'bold' }
};
