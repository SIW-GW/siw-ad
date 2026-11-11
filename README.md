# siw-ad

学校のコミュニティで作ったアプリを、お互いのアプリの画面下で紹介し合うための静的な広告配信サイトです。

広告データはpublicリポジトリのJSON・画像で管理します。DB、閲覧用ログイン、外部パッケージは不要です。

## 動かす

Node.js 24.22.1をnvmで使用します。

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use
npm ci --ignore-scripts
npm run demo
```

`http://localhost:4173/siw-ad/`で、3つの架空のサンプルを使ってプレビュー・再抽選・コードのコピーを試せます。サンプルは本番ビルドに含まれません。サーバーはCtrl+Cで停止します。

本番データで確認する場合:

```bash
nvm use
npm run check
npm start
```

初回掲載作品としてQHandを登録しています。自分自身は抽選から除くため、QHandの広告枠は他の作品が登録されるまで候補なしになります。生成コードは画面下に固定する高さ72pxの横長バナーで、通常配置にも切り替えられます。

## 登録・公開

1. `images/`に紹介画像を置き、`ads/<アプリID>.json`を追加します。
2. `npm run check`で検証し、PRでレビューを受けます。
3. マージ後、GitHub Actionsで検証・ビルド・Pages配信を行います。
4. 公開ページで自分のアプリを選択し、埋め込みコードをコピーします。

初回は管理者によるPagesの有効化が必要です。コードの作成だけでは公開されません。

- [登録・設置・停止・公開の手順](docs/usage.md)
- [初期構想案](docs/initial-concept.md)
- [詳細設計](docs/design.md)

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run validate` | 本番の広告データ・画像を検証 |
| `npm test` | 検証・抽選・データ取得・ビルドのテスト |
| `npm run build` | 本番の`dist/`を生成 |
| `npm run check` | 検証・テスト・本番ビルドを順に実行 |
| `npm start` | 本番ビルドをローカル配信 |
| `npm run demo` | サンプルを`.preview/demo/`へビルドしてローカル配信 |

lint・TypeScriptの型チェックは未導入です。JavaScriptのES ModulesとNode.js標準機能のみを使用しています。
