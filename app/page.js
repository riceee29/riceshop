export const metadata = {
  title: '라이스 에셋 스토어',
  description: '나만의 멋진 로블록스 에셋 상점',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, backgroundColor: '#f5f5f5' }}>{children}</body>
    </html>
  )
}
