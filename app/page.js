'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RiceStoreUltra() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assets, setAssets] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [view, setView] = useState('shop'); 
  const [loading, setLoading] = useState(true);
  const [chargeType, setChargeType] = useState('voucher');
  const [adminInput, setAdminInput] = useState('');
  const ADMIN_PASS = '20140419ju!';

  // 제공해주신 로고 주소
  const LOGO_URL = "https://cdn.discordapp.com/attachments/1449379705546473502/1497840261915480134/Gemini_Generated_Image_rmtwv7rmtwv7rmtw.png?ex=69eefbf2&is=69edaa72&hm=743bba23cb19d2d9392aebe794b30acda7fb3ee6d4b050b7dffd648a9eabf1c8&";

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

  const loginDiscord = () => supabase.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: window.location.origin } });

  async function buyAsset(asset) {
    if (!profile || profile.balance < asset.price) return alert('잔액이 부족합니다! 충전 후 이용해주세요.');
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
    if (!error) { alert('✅ 충전 신청 완료! 관리자가 확인 후 충전해드립니다.'); setView('shop'); }
  }

  async function uploadAsset(e) {
    e.preventDefault();
    if (adminInput !== ADMIN_PASS) return alert('비밀번호가 틀렸습니다!');
    const form = e.target;
    const { error } = await supabase.from('assets').insert({
      title: form.title.value,
      price: parseInt(form.price.value),
      description: form.description.value,
      image_url: form.image.value || 'https://via.placeholder.com/800x450',
      sales_count: 0
    });
    if (error) alert('업로드 실패: ' + error.message);
    else { alert('상품 등록 성공!'); setView('shop'); init(); }
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
      <div className="gate-card slide-up">
        <img src={LOGO_URL} className="gate-logo pulse" />
        <h1>RICE STORE</h1>
        <p>최고의 로블록스 에셋 저장소</p>
        <button onClick={loginDiscord} className="discord-btn">디스코드로 입장하기</button>
      </div>
      <style jsx>{`
        .gate-container { height: 100vh; background: #000; display: flex; justify-content: center; align-items: center; }
        .gate-card { text-align: center; background: #111; padding: 60px; border-radius: 40px; border: 1px solid #333; box-shadow: 0 0 50px rgba(0,0,0,0.5); }
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
      {/* 네비게이션 */}
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
              {assets.map(asset => (
                <div key={asset.id} className="asset-card">
                  <div className="card-img"><img src={asset.image_url} /></div>
                  <div className="card-body">
                    <span className="sales-tag">구매 {asset.sales_count || 0}건</span>
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

            {/* 네이버 스타일 리뷰 */}
            <section className="review-area">
              <h3 className="rev-title">구매 후기 <span className="count">({reviews.length})</span></h3>
              <div className="review-list">
                {reviews.map(r => (
                  <div key={r.id} className="review-item border-hover">
                    <div className="rev-info"><span>{r.user_email?.split('@')[0]}***</span><span>⭐⭐⭐⭐⭐</span></div>
                    <p>{r.content}</p>
                  </div>
                ))}
                <div className="review-item border-hover">
                  <div className="rev-info"><span>rice_user***</span><span>⭐⭐⭐⭐⭐</span></div>
                  <p>블랙 테마가 정말 깔끔하고 에셋 퀄리티도 만족스럽습니다!</p>
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
                    <input name="amount" type="number" placeholder="금액 (원)" required />
                  </>
                ) : (
                  <>
                    <div className="bank-box">🏦 OO은행 123-456-7890 (라이스)</div>
                    <input name="amount" type="number" placeholder="입금 금액" required />
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
                  <div className="upload-box">
                    <h3>상품 등록</h3>
                    <form onSubmit={uploadAsset}>
                      <input name="title" placeholder="상품명" required />
                      <input name="price" type="number" placeholder="가격(원)" required />
                      <textarea name="description" placeholder="설명" required />
                      <input name="image" placeholder="이미지 URL" />
                      <button type="submit" className="submit-btn">에셋 업로드</button>
                    </form>
                  </div>
                  <div className="request-box" style={{marginTop:'30px'}}>
                    <h3>충전 승인 대기</h3>
                    <AdminChargeList onApprove={approveCharge} />
                  </div>
                </div>
              )}
              <button className="cancel-btn" onClick={()=>setView('shop')}>나가기</button>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <img src={LOGO_URL} width="40" style={{borderRadius:'8px', grayscale:'100%', opacity:'0.3'}} />
        <p>RICE STORE &copy; 2024</p>
      </footer>

      <style jsx global>{`
        body { margin: 0; background: #000; color: #bbb; font-family: 'Pretendard', sans-serif; }
        .navbar { background: #111; border-bottom: 1px solid #222; position: sticky; top: 0; z-index: 100; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        .nav-inner { max-width: 1100px; margin: 0 auto; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; }
        .logo-group { display: flex; align-items: center; gap: 12px; cursor: pointer; color: #fff; font-weight: 900; font-size: 20px; transition: 0.3s; }
        .logo-group:hover { transform: scale(1.05); }
        .nav-logo { width: 36px; height: 36px; border-radius: 8px; }
        .user-badge { display: flex; align-items: center; gap: 15px; background: #1a1a1a; padding: 6px 16px; border-radius: 30px; border: 1px solid #333; }
        .balance { font-weight: 800; color: #fff; }
        .charge-nav-btn { background: #fff; border: none; padding: 4px 12px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 11px; }
        .avatar { width: 28px; border-radius: 50%; border: 2px solid #333; }
        .logout-btn { background: none; border: none; color: #555; cursor: pointer; font-size: 11px; }

        .main-content { padding-top: 40px; }
        .asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 35px; max-width: 1100px; margin: 0 auto; padding: 20px; }
        .asset-card { background: #121212; border: 1px solid #222; border-radius: 20px; overflow: hidden; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .asset-card:hover { transform: translateY(-15px); border-color: #555; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .card-img { height: 200px; background: #1a1a1a; }
        .card-img img { width: 100%; height: 100%; object-fit: cover; }
        .card-body { padding: 25px; position: relative; }
        .sales-tag { position: absolute; top: -160px; left: 15px; background: rgba(0,0,0,0.7); color: #fff; padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: bold; }
        .card-body h3 { color: #fff; margin: 0 0 10px 0; font-size: 20px; }
        .card-body p { color: #666; font-size: 14px; height: 40px; overflow: hidden; }
        .card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 25px; }
        .price { font-size: 24px; font-weight: 900; color: #fff; }
        .card-footer button { background: #fff; color: #000; border: none; padding: 12px 25px; border-radius: 12px; font-weight: 900; cursor: pointer; transition: 0.2s; }
        .card-footer button:hover { background: #8ec5fc; }

        .review-area { max-width: 1100px; margin: 100px auto; border-top: 1px solid #222; padding: 60px 20px; }
        .rev-title { font-size: 26px; color: #fff; margin-bottom: 40px; }
        .review-item { background: #0a0a0a; padding: 25px; border-radius: 15px; margin-bottom: 20px; border: 1px solid #1a1a1a; transition: 0.3s; }
        .border-hover:hover { border-color: #444; background: #111; }
        .rev-info { display: flex; justify-content: space-between; color: #666; font-size: 13px; margin-bottom: 12px; }

        .admin-panel { display: flex; justify-content: center; padding: 80px 20px; }
        .glass-card { background: #111; padding: 45px; border-radius: 30px; border: 1px solid #222; width: 100%; max-width: 480px; box-shadow: 0 20px 60px rgba(0,0,0,0.6); }
        .tabs { display: flex; gap: 12px; margin-bottom: 30px; }
        .tabs button { flex: 1; padding: 12px; background: #1a1a1a; border: 1px solid #333; color: #555; cursor: pointer; border-radius: 10px; font-weight: bold; }
        .tabs button.active { background: #fff; color: #000; border-color: #fff; }
        input, textarea { width: 100%; padding: 15px; background: #0a0a0a; border: 1px solid #222; border-radius: 12px; color: #fff; margin-bottom: 15px; box-sizing: border-box; outline: none; }
        input:focus { border-color: #555; }
        .submit-btn { width: 100%; background: #fff; color: #000; border: none; padding: 18px; border-radius: 12px; font-weight: 900; cursor: pointer; transition: 0.3s; }
        .submit-btn:hover { background: #8ec5fc; }

        .footer { text-align: center; padding: 120px 0 60px 0; border-top: 1px solid #111; color: #333; }
        .fade-in { animation: fadeIn 0.8s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .loader { height: 100vh; display: flex; justify-content: center; align-items: center; color: #555; font-weight: 900; letter-spacing: 6px; background: #000; }
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
        <div key={r.id} style={{padding:'20px', background:'#0a0a0a', border:'1px solid #222', borderRadius:'15px', marginBottom:'15px'}}>
          <p style={{margin:0, color:'#8ec5fc'}}><strong>{r.request_type==='voucher'?'🎫 문상':'🏦 무통장'} - {r.amount.toLocaleString()}원</strong></p>
          <p style={{color:'#555', fontSize:'12px', margin:'5px 0'}}>{r.user_email}</p>
          {r.request_type==='voucher' ? <p style={{color:'#fff', fontSize:'18px', fontWeight:'bold', background:'#1a1a1a', padding:'10px', borderRadius:'8px', marginTop:'10px'}}>{r.voucher_pin}</p> : <p>입금자: {r.sender_name}</p>}
          <button onClick={()=>onApprove(r)} style={{width:'100%', padding:'12px', background:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', marginTop:'15px'}}>입금 확인 및 승인</button>
        </div>
      ))}
      {list.length === 0 && <p style={{color:'#333', textAlign:'center'}}>대기 중인 요청이 없습니다.</p>}
    </div>
  );
}
