import { Redirect } from 'expo-router';

/**
 * 写真・ファイル・Google ドライブなどの共有シートで「my coordy」を選ぶと、
 * 共有エクステンションが mycoordy://expo-sharing でアプリを開く。
 * 受け取った画像は登録画面（useIncomingShare）で読み込む。
 */
export default function IncomingShare() {
  return <Redirect href="/item/scan" />;
}
