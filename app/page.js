'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SafeRiceStore() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assets, setAssets] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [purchasedIds, setPurchasedIds] = useState([]);
  const [myCharges, setMyCharges] = useState([]);
  const [view, setView] = useState('shop'); 
  const [loading, setLoading] = useState(true);
  const [chargeType, setChargeType] = useState('voucher');
  const [adminInput, setAdminInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const ADMIN_PASS = '20140419ju!';

  const LOGO_URL = "https://cdn.discordapp.com/attachments/1449379705546473502/1497840261915480134/Gemini_Generated_Image_rmtwv7rmtwv7rmtw.png?ex=69eefbf2&is=69edaa72&hm=743bba23cb19d2d9392aebe794b30acda7fb3ee6d4b050b7dffd648a9eabf1c8&";

  const WEBHOOKS = {
    BUY: "https://discord.com/api/webhooks/1497845253087170672/hXAS_gMbVq7NUfXtvhgY-vQrCxDN5aYsOcbaReE_0Ank6y-J21X4L7LSh6vaZcQqIIAU",
    CHARGE: "https://discord.com/api/webhooks/1497845401183715399/KwXSgBDoiaLPLdBeCcyJ3nf8P0rqbUbXLbM85mA2-ckyFKdFryrMSVhmk_pgLduximFr",
    JOIN: "https://discord.com/api/webhooks/1497845499640938587/ANIOgZpn69tIf1rkLy3IJKT1klN1jfJ5WuvVKdVGofvdVWqCFr7Imkq2s7GDo2Q8Hu5a",
    UPLOAD: "https://discord.com/api/webhooks/1497846008309223585/T2uAIhQwEvLnydCCQ7Ec9N9aPGXp4Zusx68KyrJwXsfaGYaHhinnJ45EWQLTmWiKg7Ec"
  };

  useEffect(() => { init(); }, []);

  async function init() {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        setUser(u);
        const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single();
        setProfile(p || { balance: 0 });
        const { data: pur } = await supabase.from('purchases').select('asset_id').eq('user_id', u.id);
        setPurchasedIds(pur?.map(item => item.asset_id) || []);
        const { data: char } = await supabase.from('charge_requests').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(3);
        setMyCharges(char || []);
      }
      const { data: assetsData } = await supabase.from('assets').select('*').order('id', { ascending: false });
      setAssets(assetsData || []);
      const { data: revData } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
      setReviews(revData || []);
    } catch (e) {
      console.error("데이터 로딩 중 오류:", e);
    } finally {
      setLoading(false);
    }
  }

  async function sendWebhook(url, title, message, color) {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{ title, description: message, color, thumbnail: { url: LOGO_URL }, timestamp: new Date().toISOString() }]
        })
      });
    } catch (e) { console.error("웹후크 전송 실패"); }
  }

  async function buyAsset(asset) {
    if (!profile || profile.balance < asset.price) return alert('잔액이 부족합니다.');
    const { error } = await supabase.from('profiles').update({ balance: profile.balance - asset.price }).eq('id', user.id);
    if (!error) {
      await supabase.from('purchases').insert({ user_id: user.id, asset_id: asset.id });
      await supabase.from('assets').update({ sales_count: (asset.sales_count || 0) + 1 }).eq('id', asset.id);
      sendWebhook(WEBHOOKS.BUY, "🛍️ 구매 완료", `**구매자:** ${user?.email}\n**상품:** ${asset.title}`, 0x3498db);
      alert('구매 완료!'); init();
    }
  }

  if (loading) return <div className="loader">RICE STORE...</div>

  // --- 로그인 전 (GATE) ---
  if (!user) return (
    <div className="gate">
      <div className="gate-card">
        <img src={LOGO_URL} className="gate-logo" alt="logo" />
        <h1>RICE STORE</h1>
        <button onClick={() => supabase.auth.signInWithOAuth({provider:'discord'})} className="discord-main-btn">LOGIN WITH DISCORD</button>
      </div>
      <style jsx>{`
        .gate { height: 100vh; background: #000; display: flex; justify-content: center; align-items: center; color: #fff; }
        .gate-card { background: #0a0a0a; padding: 60px; border-radius: 40px; border: 1px solid #1a1a1a; text-align: center; }
        .gate-logo { width: 120px; border-radius: 20px; margin-bottom: 20px; }
        .discord-main-btn { background: #fff; color: #000; border: none; padding: 15px 40px; border-radius: 12px; font-weight: 900; cursor: pointer; }
      `}</style>
    </div>
  );

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-inner">
          <div className="logo" onClick={() => setView('shop')}>
            <img src={LOGO_URL} className="nav-logo" alt="logo" />
            <span>RICE STORE</span>
          </div>
          <div className="nav-right">
            <span className="admin-btn" onClick={() => setView('admin')}>ADMIN</span>
            <div className="user-info">
              <div className="balance-info">
                <span className="bal-val">{profile?.balance?.toLocaleString() || 0}원</span>
              </div>
              <button className="charge-nav" onClick={() => setView('charge')}>+</button>
              {user?.user_metadata?.avatar_url && (
                <img src={user.user_metadata.avatar_url} className="nav-pfp" alt="avatar" />
              )}
              <button className="logout-btn" onClick={() => supabase.auth.signOut().then(()=>window.location.reload())}>✕</button>
            </div>
          </div>
        </div>
      </nav>

      {/* 충전 알림 바 */}
      {myCharges.length > 0 && view === 'shop' && (
        <div className="status-bar">
          {myCharges.map(c => (
            <div key={c.id} className="status-item">
              {c.amount}원 {c.status === 'pending' ? '⏳ 대기중' : '✅ 완료'}
            </div>
          ))}
        </div>
      )}

      <main className="content">
        {view === 'shop' ? (
          <div className="grid">
            {assets.length > 0 ? assets.map(asset => (
              <div key={asset.id} className="card">
                <img src={asset.image_url} alt="asset" />
                <div className="card-body">
                  <h3>{asset.title}</h3>
                  <div className="card-footer">
                    <span>{asset.price?.toLocaleString()}원</span>
                    {purchasedIds.includes(asset.id) ? (
                      <button onClick={async () => {
                        const { data } = await supabase.storage.from('asset-files').createSignedUrl(asset.file_path, 60);
                        if(data) window.location.href = data.signedUrl;
                      }} className="dl-btn">DOWNLOAD</button>
