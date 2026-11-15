// 画像を import したときの型（Metro は画像を数値のアセット ID として扱う）
declare module '*.png' {
  const asset: number;
  export default asset;
}
declare module '*.jpg' {
  const asset: number;
  export default asset;
}
