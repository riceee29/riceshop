'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RiceShop() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true); // 로딩 상태 추가

  useEffect(() => {
    async function init() {
      try {
        const { data: assetsData } = await supabase.from('assets').select('*');
        setAssets(assetsData || []);
        
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setUser(authUser);
          const { data: profileData } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
          setProfile(profileData);
        }
      } catch (e) {
        console.error("에러 발생:", e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}><h1>🍚 라이스 에셋 스토어 로딩 중...</h1><p>잠시만 기다려주세요.</p></div>

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #333', paddingBottom: '20px' }}>
        <h1>🍚 라이스 에셋 스토어</h1>
        {user ? (
          <div>{user.email} | 잔액: 💰{profile?.balance || 0}원</div>
        ) : (
          <p>로그인이 필요합니다.</p>
        )}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '30px' }}>
        {assets.length > 0 ? assets.map(asset => (
          <div key={asset.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '10px' }}>
            <h2>{asset.title}</h2>
            <p>{asset.price}원</p>
            <button style={{ width: '100%', padding: '10px', cursor: 'pointer' }}>구매하기</button>
          </div>
        )) : (
          <p>등록된 상품이 없습니다. Supabase에서 상품을 추가해주세요!</p>
        )}
      </div>
    </div>
  )
}
