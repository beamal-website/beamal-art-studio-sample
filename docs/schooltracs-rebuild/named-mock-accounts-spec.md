# 三個具名測試帳戶與同一資料來源

> **歷史提案，部分內容未採用。** 下文的 username、dataset 識別及 `provisionNamedDemo` 合約不是目前採用的實作。實際三個指定 Gmail 測試帳戶由明確的本機初始化命令建立；後續共用 Enrollment 與正式學生課表亦不是下文提議的 mock 課次讀取關聯。
>
> `d78b038`／當時 543 項測試與連結的中期報告只作歷史紀錄。後續另有營運、老師及學生的介面預覽，不能當作全部後端業務完成；新增介面尚未完成瀏覽器視覺驗收。最新實作與驗證以對應 Git 提交紀錄為準，SchoolTracs 歷史 QA 圖片不代表本輪重新對齊已通過。以下原提案及當時更新保留不改。

> **2026-10-15 中期檢查更新：下文是尚未全部實作的原設計，不是完成紀錄。** 使用者其後指定以 `admin@gmail.com`、`teacher@gmail.com`、`student@gmail.com` 登入；已在持久本機服務建立三人，使用使用者指定的測試密碼。原提議的 username、新 Student 接口、正式 Staff 畫面與資料集識別仍未實作；新增業務功能按使用者要求暫停。現況與驗收界線以[中期檢查](midterm-20261015.md)為準。

制定：2026-10-15，修改程式前。承接使用者本日明確要求：老師兼Admin、普通老師、學生各一個具名mock帳戶及username/password；退休1／2捷徑與假Staff權限儲存，Admin改動須同步給相關老師及學生。完整SchoolTracs＋Notion目標及4老師／300 active學生／6課／3–18歲驗收仍繼續，本片不是整套完成。

## 使用者效果與界線

三個全新虛構人物為林雅晴 Maya Lam（老師兼Admin）、陳子朗 Leo Chan（普通Teacher）、何詠晴 Chloe Ho（Student）。每人獨立登入，Admin保留admin角色再明確連正式授課資源，不建立第四種角色。username使用maya.lam／leo.chan／chloe.ho；各有明確的新測試密碼，命令只建立本組新人物，不讀取或重設其他人的憑證。既有email登入保持相容。

普通老師沿用Admin同一Beamal外框、時間表／課程布局，資料範圍由正式老師連結及讀取授權決定。Staff頁接已保存的老師與帳戶連結／範圍授權，退休Teacher1／2假卡片與只顯通知的權限Save；本片不把讀取授權假裝成Attendance或其他尚未接入的寫入權限。

Student讀自己獲指定的mock課次；日期、時間、課程及老師來自同一schedule ID＋固定sequence。這是明確mock讀取關聯，不造已付費Enrollment、座位數、Receipt、StudentSession或付款成功；正式入班／家庭／調課仍屬後續核心。Student不可藉此讀其他學生、內部備註、私人規則或全校課表。

## 登入與資料合約

- users新增可空的唯一username；舊用戶不按姓名／email前綴猜username。登入接受username或email其中一種＋password，非法／多識別欄位拒絕，沿用密碼雜湊、cookie、CSRF、Origin及既有錯誤／限流。SDK保留既有email呼叫相容，username走正式驗證，不用前端角色捷徑。
- 本機demo3初始化使用明確profile key及穩定user／course／resource／schedule／關聯ID。核對同一profile後重跑只沿用，不覆寫已修改的排課／費用／帳戶。撞到不屬本組的username／email／ID，須整組失敗，不猜同名身份。初始化與關聯一起成功或撤回。
- 本組新密碼由本片指定，不能從既有bootstrap-accounts.json讀出；命令不得輸出任何舊密碼／cookie／token。舊1／2是離線快捷路徑，退休它不等於刪除未知帳戶、人物、audit或歷史。
- 新學生只讀接口回自己profile及獲指定課次的安全投影，支援日期範圍及revision。直接ID也驗授權；未授權、撤權及身份更改不能留下舊私有快取。取消／移日／換老師等跟隨同一UUID＋sequence，不從legacy bookings重建日期。
- Staff沿用已正式保存的access-control使用者、老師連結及course/resource/occurrence讀取授權，不增全校read-all。未實作的寫入能力保持不可操作，不能只靠隱藏按鈕保護。

## 同步與日後搬到server

目前網站只向同一API送單項修改，由服務保存同一SQLite資料庫；不把整份localStorage或整庫推上去覆寫。保存採開表版本，舊版本409保草稿；重試同一operation key只保存一次；回覆的ID／版本為準。老師與學生按revision輪詢及視窗focus刷新，身份／範圍改變清快取，舊回覆不能回滾最新畫面。失去服務顯錯誤，不回退1／2或離線假保存。

日後server作唯一資料來源，網站／iOS共用同一API。若搬資料，要先停止舊端寫入，搬一致資料與附件並保留ID、版本、audit及重試記錄，再切API及重新登入。資料集識別／schema版本可辨別不同資料來源；不實作兩個資料庫各自寫再互相覆蓋。尚未部署或驗證真遠端搬遷，不以本機409測試冒稱完成server同步。

## 分工與驗收

Backend負責username／auth合約、可重跑demo3 provision、新學生安全課表與讀取關聯、同資料集識別及相應真HTTP測試，修改store/app/validation/security（必要時）／access-control及新模組。UI worker只負責純Student課表與Staff markup、 scoped CSS及純UI tests。Root負責SDK、src.js接線、登入及數字捷徑退休、本機命令／實際fixture、GUI、docs與Git。獨立QA負責SDK／跨身份與刷新flow及最後review。所有人保留其他人的改動，只有Root做全套npm／依序build／瀏覽器／Git；不讀.data私人憑證。

先有意義RED，再最小GREEN。驗username／email相容、錯密碼／越權、重跑不重設資料或重建IDs、撞名全撤回、重啟、Student限定投影與撤權、Admin兼任授課、普通Teacher範圍、Admin scoped變更在Teacher／Student同UUIDseq讀回、取消／Undo及名稱變更、過期修改409、重送不重複、身份切換與晚回覆。GUI驗三個真登入、原排課修改後讀回、重載、390中英文及Staff實際授權；不把VM、姓名字串或本機陣列當共享證據。

功能修改最後依序npm test --prefix sample → npm run build --prefix sample。只在test工作，不改main／AGENTS.md／Beamal圖片／原提案，不部署。未定的StudentConvert前置、Total公式、公開Trial必填及多人主色政策保持待答，不由mock讀取授權推導。
