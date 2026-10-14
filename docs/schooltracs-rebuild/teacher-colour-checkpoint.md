# 老師代表色：限定實作與驗收

更新：2026-10-15。依 [本片規格](teacher-colour-spec.md) 及 Notion §5.4／C-03；沿用正式排課老師資源，保留 Beamal 風格、圖片、手機及中英文。單老師主色路徑已有程式與指定測試；整 C-03、多老師主色政策及整套 Goal 尚未完成。本檔以一張目前證據表更新，歷史結果另保留短項，不把指定測試當真正畫面驗收。

## 本片效果及資料界線

- Admin 可以保存／清除正式 Teacher 的 `representativeColor`；只接受六位十六進位色碼，保存轉小寫，未設定保持 null。Create 省略為 null，PATCH 省略保留、null 明確清除；Room 不接受這個欄位。沿用開表版本、固定重試識別及修改記錄，不建立 Login／Staff Profile／新授權。
- 某堂只有一個正式 teacher ID 且已設定色時，日／週／連續日子／月／List 及詳情使用該老師目前色。單堂例外按實際該堂 teacher IDs，不沿用系列最初老師；舊文字不按同名配對。未設定或沒有正式指派時，普通排課保留原 `schedule.color`，Available Slot 保留中性 Beamal 色。
- 多老師未選主老師，不用陣列第一位或目錄順序決定主色。暫保原底色，提供各老師姓名／色樣；平均分段或指定主老師仍等使用者回答，不能把色樣當作多人主色政策已完成。
- 色只作顯示投影：不改排課／Slot 自己版本、指派、日期、容量、資格、quota、held reservation 的來源識別或學生狀態。Teacher 仍唯讀本人／grant 資料；不新增 ACL 或擴張可讀範圍。
- 私有 Slot 帶按 teacher UUID 對應的 `teacherColors`。來源版本判斷同時保護姓名與色，不能用較舊資源快取覆蓋較新 Slot 投影；匿名 public DTO 不加老師 ID／私人metadata／顏色，不改其白名單。
- 已開只讀詳情在單純改色時以局部 dot／色樣／CSS 更新，不重建整個視窗；輸入中或待保存表單維持開表資料。真正手機取消／返回及已保存藍色、單堂橙色已有下表證據；黑／白色持久保存後的畫面仍未驗。

## 目前證據表

| 證據 | 已取得結果與限制 |
|---|---|
| 新主流程 | **6／6（原5＋review補1）**：正式 Save／nullclear／Room白名單、開表版本／固定key／409草稿／Cancel、5檢視與ACK／資源更新、effective單堂與multi／legacy、Teacher唯讀及跨身份舊receipt。來源較新的姓名／色、只讀詳情局部更新亦在原案例核對；新增source-only ACK案例含single、UUID反序／新指派、linked同ref與standalone來源改動五種對照。 |
| 純helper | **7／7**，`teacher-colour-ui.test.mjs`：嚴格色碼、正式單人主色、multi／legacy fallback、安全CSS、UUID／姓名／色樣對齊；不是瀏覽器或畫面可讀性證據。 |
| 新資源UI | **5／5**，`scheduling-resources-ui.test.mjs`：enable checkbox、已保存／未設定色、readonly／busy、列表樣本及Room無色欄。 |
| Available Slot純UI | **16／16（本輪新增1，原15保留）**：只讀詳情單色／多姓名色樣；其餘公開及容量回歸保留。 |
| 真HTTP | **20／20（本輪新增2＋原18）**，resource＋AvailableSlot套件：色正常化／nullclear／相容／持久／版本與角色，私有有效指派色、來源版本及held／quota／public不改。 |
| 獨立前端全檔 | **267／267，3.9728秒、exit0**（flows246＋SDK21），`/tmp/beamal-teacher-colour-front-final-after-source-merge.log`；新source-only修正後真正重跑全部前端與SDK，保留舊斷言。沒有新增SDK方法；語法檢查通過。 |
| 新review來源競態 | **genuine RED→GREEN**，`/tmp/beamal-teacher-colour-source-ack-red.log`→`/tmp/beamal-teacher-colour-final-focused.log`。ACK新own v2／配置10,3,2保存，同UUID較新source v2姓名／色不退版；反序及新指派按ID對齊。linked同ref保較新真單堂日期／時間／老師／課室／classCapacity，standalone明改來源採ACK；後續List503仍顯saved同ID。 |
| Root最後完整npm／依序build | **490／490，44.7252秒、exit0**，`/tmp/beamal-teacher-colour-final-full-test.log`；之後依序build **2.81秒成功、exit0**，`/tmp/beamal-teacher-colour-final-build.log`。均為sourceMerge最後凍結後的實際結果；獨立原兩PoC亦重新GREEN。沒有用窄套件代替全套。 |
| 真畫面：Admin保存／清除 | Root以最後build、本機5180真正操作：Teacher B `345ee775-14da-4f81-a8f3-db23d3738621` 原null→`#426ea8`保存、同ID重開；清除→null重開色選擇器disabled，再恢復藍色。沒有把色保存當新Login或Staff建立。 |
| 真畫面：普通排課／linked／單堂指派 | 正式series `c6cf7766-fc14-45d0-a6db-0d99ba0152c2`，課程`d46852df-29b3-4991-a62d-d212990e039e`，16／23日13:00、60分鐘、班額8；原底色teal，Teacher B卡片藍色。Linked Slot `8da7ebf6-29bb-4db0-b5ab-699e6e3c358c` 引用seq1、配置8／2／1亦藍色。This lesson only把16日B改成Teacher C `8ac66b96-19b0-4d26-b7c7-47a667b3ed49`（`#b9772f`、無Login），當日正常課及linked同橙色；23日seq2仍B藍色，Slot ID／配額配置／時間不變。普通legacy Teacher1仍teal，未按同名配對。[中文月檢視](/tmp/beamal-teacher-colour-month.png)、[關聯時段詳情](/tmp/beamal-teacher-colour-linked-detail.png)。五種檢視全覆蓋仍以主流程測試證明，不冒作每種都做本輪GUI。 |
| 真畫面：Teacher唯讀／colour-only即時更新 | 真Teacher帳戶重開standalone Slot `84b97aeb-60c6-4477-acc6-cce8822181c3` 17:00詳情同藍色，無Edit／Add／內部remark。背景只清色時既有詳情變中性色、marker清空，原`availability-close`焦點保留且未重開；恢復後重開仍藍色。[Teacher唯讀畫面](/tmp/beamal-teacher-colour-teacher-readonly.png)。 |
| 匿名公開核對 | colour clear／restore前後以無cookie HTTP核對，公開回覆**包含revision逐byte相同**；未加入私人顏色、ID或內部metadata。這是實際HTTP證據，不聲稱本輪又做SchoolTracs Chrome對照。 |
| 真畫面：390手機中英文／不保存 | 390×844，中文及英文Admin表單寬374、pageWidth390；未保存黑色Cancel、Escape、未保存白色browser Back離頁後再開，均仍保存的藍色。[英文手機表單](/tmp/beamal-teacher-colour-mobile-editor-en.png)。未做真正黑／白色持久保存或多人主色畫面；上述暫存截圖只作本機驗收證據。 |

Teacher由B→C改實際指派會改變授權範圍，既定session重驗會清舊詳情／快取，再讀仍授權的standalone；獨立review已確認。Colour／姓名不參與授權指紋，因此上述colour-only保焦點證明不延伸到指派／權限變更。

## RED 分類與有限歷史

- genuine RED：public Save payload原本漏色欄；既有單老師排課仍原底色；effective單堂B及Teacher已授權課仍未套色。初次修正後5flow／266前端通過（5.3243秒），為新source-only review前的歷史結果；不當最新版本的最終證據。
- 未把純UI尚未落地、缺標準DOM stub或Teacher換日期窗口未等待資料的測試準備問題當產品缺陷。較新姓名／色tuple及已開詳情局部更新是既有有意義案例補強；沒有改舊斷言降低要求。
- 新source-only ACK是真正新增資料問題，永久回歸先RED後GREEN；不能只拒絕整筆ACK而丟新配置。linked案例使用含15／16日的Week窗口並先驗新移日資料確實已讀；不把原Day15 fixture看不到16日造成的測試準備失敗當產品缺陷。

## 完成邊界

C-04／C-05正式Class佔用／Full／Available角標與老師主色是不同維度，仍需Enrollment與manual Full政策；不拿Trial滿額、空名單或null佔用造班額綠點。Trial Submit／Total合算／Convert／Family／付款／Receipt／通知／To-do／Staff等既有核心需求繼續保留，未決問答不靠等待時間批准，也不把整Goal標blocked。

111項來源狀態、整頁對齊與4老師／300 active學生／6課／3–18歲本機大檢查未完成，不轉成minor。未改圖片／依賴／schema／CI／外部發送；本檔不記未知Commit／push或部署／iOS成果。
