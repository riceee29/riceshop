'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RiceStoreUltimate() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assets, setAssets] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [view, setView] = useState('shop'); 
  const [loading, setLoading] = useState(true);
  const [chargeType, setChargeType] = useState('voucher');
  const [adminInput, setAdminInput] = useState('');
  const ADMIN_PASS = '20140419ju!';

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    const { data: assetsData } = await supabase.from('assets').select('*').order('id', { ascending: false });
    setAssets(assetsData || []);
    const { data: revData } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
    setReviews(revData || []);
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      setUser(u);
      const { data } = await supabase.from('profiles').select('*').eq('id', u.id).single();
      setProfile(data);
    }
    setLoading(false);
  }

  const loginDiscord = () => supabase.auth.signInWithOAuth({ provider: 'discord' });

  async function buyAsset(asset) {
    if (!profile || profile.balance < asset.price) return alert('잔액이 부족합니다. 충전 후 이용해주세요!');
    const { error: pErr } = await supabase.from('profiles').update({ balance: profile.balance - asset.price }).eq('id', user.id);
    const { error: aErr } = await supabase.from('assets').update({ sales_count: (asset.sales_count || 0) + 1 }).eq('id', asset.id);
    if (!pErr && !aErr) { alert(`✅ [${asset.title}] 구매 완료!`); init(); }
  }

  async function requestCharge(e) {
    e.preventDefault();
    const { error } = await supabase.from('charge_requests').insert({
      user_id: user.id, user_email: user.email,
      amount: parseInt(e.target.amount.value),
      sender_name: e.target.sender_name?.value || '',
      voucher_pin: e.target.voucher_pin?.value || '',
      request_type: chargeType
    });
    if (!error) { alert('✅ 충전 신청이 완료되었습니다!'); setView('shop'); }
  }

  async function approveCharge(req) {
    if (!confirm('충전을 승인하시겠습니까?')) return;
    const { data: p } = await supabase.from('profiles').select('balance').eq('id', req.user_id).single();
    await supabase.from('profiles').update({ balance: (p.balance || 0) + req.amount }).eq('id', req.user_id);
    await supabase.from('charge_requests').update({ status: 'success' }).eq('id', req.id);
    alert('승인 완료!'); init();
  }

  if (loading) return <div className="loader">RICE STORE LOADING...</div>

  if (!user) return (
    <div className="gate-container">
      <div className="gate-card">
        <img src="/picture.png" className="gate-logo" />
        <h1>RICE STORE</h1>
        <p>최고의 로블록스 에셋을 만나보세요.</p>
        <button onClick={loginDiscord} className="discord-main-btn">디스코드로 입장하기</button>
      </div>
      <style jsx>{`
        .gate-container { height: 100vh; background: #000; display: flex; justify-content: center; align-items: center; }
        .gate-card { text-align: center; background: #111; padding: 60px; border-radius: 30px; border: 1px solid #222; }
        .gate-logo { width: 100px; margin-bottom: 20px; }
        .discord-main-btn { background: #fff; color: #000; border: none; padding: 15px 40px; border-radius: 10px; font-weight: bold; cursor: pointer; transition: 0.3s; }
        .discord-main-btn:hover { background: #8ec5fc; transform: translateY(-5px); }
      `}</style>
    </div>
  );

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="nav-inner">
          <div className="logo-group" onClick={() => setView('shop')}>
            <img src="/picture.png" className="nav-logo" />
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
            <div className="hero-text">
              <h2>Premium Assets</h2>
              <p>엄격한 검수를 거친 고품질 모델 저장소</p>
            </div>
            <div className="asset-grid">
              {assets.map(asset => (
                <div key={asset.id} className="asset-card">
                  <div className="card-img"><img src={asset.image_url} /></div>
                  <div className="card-body">
                    <span className="sales-tag">구매 {asset.sales_count || 0}</span>
                    <h3>{asset.title}</h3>
                    <p>{asset.description}</p>
                    <div className="card-footer">
                      <span className="price">{asset.price.toLocaleString()}원</span>
                      <button onClick={() => buyAsset(asset)}>구매하기</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <section className="review-area">
              <h3>실시간 구매평 <span className="count">{reviews.length}</span></h3>
              <div className="review-list">
                {reviews.map(r => (
                  <div key={r.id} className="review-item">
                    <div className="rev-info"><span>{r.user_email?.split('@')[0]}***</span><span>⭐⭐⭐⭐⭐</span></div>
                    <p>{r.content}</p>
                  </div>
                ))}
                <div className="review-item">
                  <div className="rev-info"><span>rice_user***</span><span>⭐⭐⭐⭐⭐</span></div>
                  <p>디자인이 회색/블랙이라 간지나네요. 에셋도 잘 작동합니다!</p>
                </div>
              </div>
            </section>
          </div>
        ) : view === 'charge' ? (
          <div className="admin-panel fade-in">
            <div className="glass-card">
              <h2>포인트 충전</h2>
              <div className="tabs">
                <button className={chargeType==='voucher'?'active':''} onClick={()=>setChargeType('voucher')}>문화상품권</button>
                <button className={chargeType==='bank'?'active':''} onClick={()=>setChargeType('bank')}>무통장입금</button>
              </div>
              <form onSubmit={requestCharge}>
                {chargeType === 'voucher' ? (
                  <>
                    <p className="hint">문화상품권 PIN 번호를 입력하세요.</p>
                    <input name="voucher_pin" placeholder="0000-0000-0000-000000" required />
                    <input name="amount" type="number" placeholder="금액 (예: 5000)" required />
                  </>
                ) : (
                  <>
                    <div className="bank-box">🏦 OO은행 123-456-7890 (예금주: 라이스)</div>
                    <input name="amount" type="number" placeholder="입금 금액" required />
                    <input name="sender_name" placeholder="입금자명" required />
                  </>
                )}
                <button type="submit" className="submit-btn">신청하기</button>
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
                <div className="admin-content">
                  <h3>충전 승인 대기</h3>
                  <AdminChargeList onApprove={approveCharge} />
                </div>
              )}
              <button className="cancel-btn" onClick={()=>setView('shop')}>나가기</button>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <img src="/picture.png" width="30" />
        <p>RICE STORE &copy; 2024</p>
      </footer>

      <style jsx global>{`
        body { margin: 0; background: #050505; color: #ccc; font-family: 'Inter', sans-serif; }
        .navbar { background: #111; border-bottom: 1px solid #222; position: sticky; top: 0; z-index: 100; }
        .nav-inner { max-width: 1100px; margin: 0 auto; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; }
        .logo-group { display: flex; align-items: center; gap: 12px; cursor: pointer; color: #fff; font-weight: bold; font-size: 20px; }
        .nav-logo { width: 32px; border-radius: 5px; }
        .user-badge { display: flex; align-items: center; gap: 15px; background: #1a1a1a; padding: 5px 15px; border-radius: 30px; border: 1px solid #333; }
        .balance { font-weight: bold; color: #fff; }
        .charge-nav-btn { background: #fff; border: none; padding: 3px 10px; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 11px; }
        .avatar { width: 28px; border-radius: 50%; border: 1px solid #444; }
        .logout-btn { background: none; border: none; color: #666; cursor: pointer; font-size: 11px; }
        .hero-text { text-align: center; margin: 60px 0; }
        .hero-text h2 { font-size: 40px; color: #fff; margin: 0; }
        .asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 30px; max-width: 1100px; margin: 0 auto; }
        .asset-card { background: #121212; border: 1px solid #222; border-radius: 15px; overflow: hidden; transition: 0.3s; }
        .asset-card:hover { transform: translateY(-10px); border-color: #444; }
        .card-img { height: 180px; background: #1a1a1a; }
        .card-img img { width: 100%; height: 100%; object-fit: cover; }
        .card-body { padding: 20px; position: relative; }
        .sales-tag { position: absolute; top: -140px; left: 15px; background: rgba(0,0,0,0.8); color: #fff; padding: 4px 10px; border-radius: 5px; font-size: 11px; font-weight: bold; }
        .card-body h3 { color: #fff; margin: 10px 0; }
        .card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
        .price { font-size: 20px; font-weight: bold; color: #fff; }
        .card-footer button { background: #fff; color: #000; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .review-area { max-width: 1100px; margin: 80px auto; border-top: 1px solid #222; padding-top: 40px; }
        .review-item { background: #0f0f0f; padding: 20px; border-radius: 10px; margin-bottom: 15px; border: 1px solid #1a1a1a; }
        .rev-info { display: flex; justify-content: space-between; color: #555; font-size: 13px; margin-bottom: 8px; }
        .admin-panel { display: flex; justify-content: center; padding: 80px 20px; }
        .glass-card { background: #111; padding: 40px; border-radius: 20px; border: 1px solid #222; width: 100%; max-width: 450px; }
        .tabs { display: flex; gap: 10px; margin-bottom: 20px; }
        .tabs button { flex: 1; padding: 10px; background: #1a1a1a; border: 1px solid #333; color: #555; cursor: pointer; border-radius: 8px; }
        .tabs button.active { background: #fff; color: #000; font-weight: bold; }
        input, textarea { width: 100%; padding: 12px; background: #0a0a0a; border: 1px solid #222; border-radius: 8px; color: #fff; margin-bottom: 15px; box-sizing: border-box; }
        .submit-btn { width: 100%; background: #fff; color: #000; border: none; padding: 15px; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .footer { text-align: center; padding: 80px 0; border-top: 1px solid #111; color: #333; }
        .fade-in { animation: fadeIn 0.6s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .loader { height: 100vh; display: flex; justify-content: center; align-items: center; color: #444; font-weight: bold; letter-spacing: 4px; }
      `}</style>
    </div>
  );
}

function AdminChargeList({ onApprove }) {
  const [list, setList] = useState([]);
  useEffect(() => { supabase.from('charge_requests').select('*').eq('status', 'pending').then(({data})=>setList(data || [])); }, []);
  return (
    <div style={{marginTop:'20px'}}>
      {list.map(r => (
        <div key={r.id} style={{padding:'20px', background:'#0a0a0a', border:'1px solid #222', borderRadius:'10px', marginBottom:'15px'}}>
          <p style={{margin:0}}><strong>{r.request_type==='voucher'?'🎫 문상':'🏦 무통장'} - {r.amount}원</strong></p>
          <p style={{color:'#666', fontSize:'12px'}}>{r.user_email}</p>
          {r.request_type==='voucher' ? <p style={{color:'#8ec5fc', fontSize:'18px', fontWeight:'bold'}}>{r.voucher_pin}</p> : <p>입금자: {r.sender_name}</p>}
          <button onClick={()=>onApprove(r)} style={{width:'100%', padding:'10px', background:'#fff', border:'none', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>입금 확인 및 승인</button>
        </div>
      ))}
      {list.length === 0 && <p style={{color:'#333'}}>대기 중인 요청이 없습니다.</p>}
    </div>
  );
}
