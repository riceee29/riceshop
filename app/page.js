'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RiceShopPro() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assets, setAssets] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState('shop'); // shop, admin

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: assetsData } = await supabase.from('assets').select('*');
    setAssets(assetsData || []);
    const { data: revData } = await supabase.from('reviews').select('*');
    setReviews(revData || []);
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      setUser(u);
      fetchProfile(u.id);
    }
  }

  async function fetchProfile(uid) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    setProfile(data);
  }

  // --- 관리자 전용 업로드 기능 (특정 코드 입력 방식이 IP보다 확실함) ---
  const [adminCode, setAdminCode] = useState('');
  async function uploadAsset(e) {
    e.preventDefault();
    if (adminCode !== '1234') return alert('관리자 인증 실패!'); // 1234를 나만의 비밀번호로 바꾸세요
    
    const form = e.target;
    const { error } = await supabase.from('assets').insert({
      title: form.title.value,
      price: parseInt(form.price.value),
      description: form.description.value,
      image_url: form.image.value,
    });
    if (!error) { alert('업로드 성공!'); init(); }
  }

  // --- 결제 및 구매 기능 ---
  async function buyAsset(asset) {
    if (!user) return alert('로그인이 필요합니다.');
    if (profile.balance < asset.price) return alert('잔액이 부족합니다. 관리자에게 충전 요청하세요!');
    
    const { error } = await supabase.from('profiles').update({ balance: profile.balance - asset.price }).eq('id', user.id);
    if (!error) {
      alert(`🎉 ${asset.title} 구매 성공!`);
      fetchProfile(user.id);
    }
  }

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', color: '#333' }}>
      {/* 네비게이션 바 */}
      <nav style={{ backgroundColor: '#fff', padding: '15px 50px', display: 'flex', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h1 style={{ cursor: 'pointer', fontSize: '24px' }} onClick={() => setView('shop')}>🍚 라이스 에셋 스토어</h1>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span onClick={() => setView('admin')} style={{ cursor: 'pointer', color: '#999' }}>관리자</span>
          {user ? (
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold' }}>💰 {profile?.balance?.toLocaleString()}원</span>
              <button onClick={() => supabase.auth.signOut()} style={{ padding: '5px 10px' }}>로그아웃</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <input placeholder="이메일" onChange={e => setEmail(e.target.value)} />
              <input type="password" placeholder="비번" onChange={e => setPassword(e.target.value)} />
              <button onClick={() => supabase.auth.signInWithPassword({email, password})}>로그인</button>
              <button onClick={() => supabase.auth.signUp({email, password})}>가입</button>
            </div>
          )}
        </div>
      </nav>

      {/* 메인 화면 */}
      {view === 'shop' ? (
        <div style={{ padding: '50px' }}>
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <h2 style={{ fontSize: '40px', marginBottom: '10px' }}>최고의 로블록스 에셋을 만나보세요</h2>
            <p style={{ color: '#666' }}>라이스 스토어에서 검증된 퀄리티의 모델을 저렴하게 구매하세요.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
            {assets.map(asset => (
              <div key={asset.id} style={{ backgroundColor: '#fff', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 5px 15px rgba(0,0,0,0.05)' }}>
                <img src={asset.image_url} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                <div style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>{asset.title}</h3>
                  <p style={{ color: '#888', fontSize: '14px', marginBottom: '15px' }}>{asset.description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#007bff' }}>{asset.price.toLocaleString()}원</span>
                    <button onClick={() => buyAsset(asset)} style={{ backgroundColor: '#007bff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>구매하기</button>
                  </div>
                  {/* 리뷰 영역 */}
                  <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    <p style={{ fontSize: '12px', color: '#aaa' }}>최근 후기:</p>
                    <p style={{ fontSize: '13px' }}>💬 아주 만족합니다! (⭐⭐⭐⭐⭐)</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* 관리자 업로드 화면 */
        <div style={{ padding: '50px', maxWidth: '600px', margin: '0 auto' }}>
          <h2>관리자 상품 업로드</h2>
          <form onSubmit={uploadAsset} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input name="title" placeholder="상품명" required />
            <input name="price" type="number" placeholder="가격" required />
            <textarea name="description" placeholder="설명" required />
            <input name="image" placeholder="이미지 주소(URL)" required />
            <input type="password" placeholder="관리자 비밀코드" onChange={e => setAdminCode(e.target.value)} required />
            <button type="submit" style={{ backgroundColor: '#333', color: '#fff', padding: '15px', cursor: 'pointer' }}>상품 등록하기</button>
          </form>
        </div>
      )}
    </div>
  )
}
