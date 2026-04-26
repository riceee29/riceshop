// --- [수정된] 상품 등록 함수 (한글 파일명 방지) ---
async function handleUploadAsset(e) {
  e.preventDefault();
  if (adminInput !== ADMIN_PASS) return alert('비밀번호가 틀렸습니다.');
  setUploading(true);
  const form = e.target;
  const file = form.file_input.files[0];

  // [수정] 파일 이름을 현재시간(숫자)으로 강제 변환하여 한글 에러 방지
  const fileExtension = file.name.split('.').pop(); // 확장자 (.rbxm) 추출
  const safeFileName = `${Date.now()}.${fileExtension}`; 

  try {
    const { error: storageErr } = await supabase.storage
      .from('asset-files')
      .upload(safeFileName, file);

    if (storageErr) throw storageErr;

    const { error: dbErr } = await supabase.from('assets').insert({
      title: form.title.value,
      price: parseInt(form.price.value),
      description: form.description.value,
      image_url: form.image.value,
      file_path: safeFileName // 깨끗한 숫자 이름을 DB에 저장
    });

    if (dbErr) throw dbErr;

    alert('🚀 등록 성공! 이제 다운로드가 잘 될 겁니다.');
    setView('shop');
    init();
  } catch (err) {
    alert('업로드 에러: ' + err.message);
  } finally {
    setUploading(false);
  }
}

// --- [수정된] 다운로드 함수 (주소 인코딩 강화) ---
async function downloadAsset(asset) {
  if (!asset.file_path) return alert('파일이 없습니다.');
  try {
    // encodeURIComponent를 사용하여 혹시 모를 특수문자/한글 처리
    const safePath = encodeURIComponent(asset.file_path).replace(/%2F/g, '/');
    
    const { data, error } = await supabase.storage
      .from('asset-files')
      .createSignedUrl(safePath, 60);

    if (error) throw error;

    const link = document.createElement('a');
    link.href = data.signedUrl;
    link.setAttribute('download', `${asset.title}.rbxm`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    alert('다운로드 실패: ' + err.message);
  }
}
