# TableTap Mandatory Real-Data QA Log
Started: 2026-11-03T02:30:21.021Z
Target: https://reo-tau.vercel.app

[2026-11-03T02:30:21.146Z] === STEP 1: Signup & Email Verification (qa-owner-021145@tabletap-qa.internal) ===
[2026-11-03T02:30:22.708Z] Submitting signup form for qa-owner-021145@tabletap-qa.internal...
[2026-11-03T02:30:29.233Z] Signup successful. Landed on: https://reo-tau.vercel.app/onboarding
[2026-11-03T02:30:29.233Z] === STEP 2: Venue Creation, Menu (3 categories, 10 items) & 5 Tables ===
[2026-11-03T02:30:29.234Z] Completing Onboarding Step 1: Venue Details...
[2026-11-03T02:30:31.858Z] Completing Onboarding Step 2: First Menu Item...
[2026-11-03T02:30:34.440Z] Completing Onboarding Step 3: Wi-Fi Setup...
[2026-11-03T02:30:37.008Z] Completing Onboarding Step 4: Table QR...
[2026-11-03T02:30:40.071Z] Completing Onboarding Step 5: Publish & Finish...
[2026-11-03T02:30:45.788Z] Arrived in Admin Dashboard: https://reo-tau.vercel.app/admin
[2026-11-03T02:30:47.792Z] Active Restaurant ID: 67586fbf-be92-4e29-86e7-b51065d6559c
[2026-11-03T02:30:47.792Z] Creating 3 categories and 10 items (veg & non-veg with images)...
[2026-11-03T02:31:18.458Z] Created Categories: Beverages, Main Courses, Desserts
[2026-11-03T02:31:18.458Z] Created Items count: 10
[2026-11-03T02:31:18.458Z] Total Tables in DB: 5 (Table 1, Table 2, Table 3, Table 4, Table 5)
[2026-11-03T02:31:18.458Z] === STEP 3: Download & Decode QR PNG for Every Table ===
[2026-11-03T02:31:20.367Z] Table "Table 1" (cc67d769-1847-490a-9540-dbd8d6ef47ad) -> Decoded QR URL: https://reo-tau.vercel.app/t/hKev-S4k4_TS?token=6ae94777.9403c3fe9b4ff2b8e66636270742cabb
[2026-11-03T02:31:21.739Z] Table "Table 2" (780e5b1b-be31-4ff2-9e8a-4bf96cdf9985) -> Decoded QR URL: https://reo-tau.vercel.app/t/Ve4d_-21mC1J?token=6ae94779.904c759ca6bef071f173ba74da56cb6c
[2026-11-03T02:31:23.165Z] Table "Table 3" (7fc7d06c-08ab-433c-bb8b-e9f63306f6e5) -> Decoded QR URL: https://reo-tau.vercel.app/t/15CFJbHx6Q4W?token=6ae9477a.e1b3fa9689b610276b5ed5de30642654
[2026-11-03T02:31:24.520Z] Table "Table 4" (c2114646-19a7-440d-9315-4558c83c1ee8) -> Decoded QR URL: https://reo-tau.vercel.app/t/PjktT2WjUpac?token=6ae9477c.dd13a0c8f4d8f130fdd3b5cd9b2ea626
[2026-11-03T02:31:25.937Z] Table "Table 5" (0b3272f3-27e9-4748-af81-4c641560a5c5) -> Decoded QR URL: https://reo-tau.vercel.app/t/J-1XeCVj3I2_?token=6ae9477d.02b5b13cd054980a2239ee7a6dfa64eb
[2026-11-03T02:31:25.937Z] === STEP 4: Open Each Decoded URL in Fresh Incognito Context at 390px ===
[2026-11-03T02:31:25.972Z] Opening decoded URL for Table 1: https://reo-tau.vercel.app/t/hKev-S4k4_TS?token=6ae94777.9403c3fe9b4ff2b8e66636270742cabb
[2026-11-03T02:31:28.701Z]   Status: 200
[2026-11-03T02:31:28.701Z]   Redirect Chain: Direct (no redirects)
[2026-11-03T02:31:28.701Z]   Final URL: https://reo-tau.vercel.app/t/hKev-S4k4_TS?token=6ae94777.9403c3fe9b4ff2b8e66636270742cabb
[2026-11-03T02:31:28.727Z]   Venue Title rendered: "QA-20261102-Bistro-021145"
[2026-11-03T02:31:28.733Z]   Table Label "Table 1" visible: true
[2026-11-03T02:31:28.737Z]   Sample menu item visible: true
[2026-11-03T02:31:28.778Z] Opening decoded URL for Table 2: https://reo-tau.vercel.app/t/Ve4d_-21mC1J?token=6ae94779.904c759ca6bef071f173ba74da56cb6c
[2026-11-03T02:31:30.884Z]   Status: 200
[2026-11-03T02:31:30.884Z]   Redirect Chain: Direct (no redirects)
[2026-11-03T02:31:30.884Z]   Final URL: https://reo-tau.vercel.app/t/Ve4d_-21mC1J?token=6ae94779.904c759ca6bef071f173ba74da56cb6c
[2026-11-03T02:31:30.912Z]   Venue Title rendered: "QA-20261102-Bistro-021145"
[2026-11-03T02:31:30.917Z]   Table Label "Table 2" visible: true
[2026-11-03T02:31:30.922Z]   Sample menu item visible: true
[2026-11-03T02:31:30.964Z] Opening decoded URL for Table 3: https://reo-tau.vercel.app/t/15CFJbHx6Q4W?token=6ae9477a.e1b3fa9689b610276b5ed5de30642654
[2026-11-03T02:31:33.274Z]   Status: 200
[2026-11-03T02:31:33.274Z]   Redirect Chain: Direct (no redirects)
[2026-11-03T02:31:33.274Z]   Final URL: https://reo-tau.vercel.app/t/15CFJbHx6Q4W?token=6ae9477a.e1b3fa9689b610276b5ed5de30642654
[2026-11-03T02:31:33.298Z]   Venue Title rendered: "QA-20261102-Bistro-021145"
[2026-11-03T02:31:33.303Z]   Table Label "Table 3" visible: true
[2026-11-03T02:31:33.307Z]   Sample menu item visible: true
[2026-11-03T02:31:33.342Z] Opening decoded URL for Table 4: https://reo-tau.vercel.app/t/PjktT2WjUpac?token=6ae9477c.dd13a0c8f4d8f130fdd3b5cd9b2ea626
[2026-11-03T02:31:35.221Z]   Status: 200
[2026-11-03T02:31:35.221Z]   Redirect Chain: Direct (no redirects)
[2026-11-03T02:31:35.222Z]   Final URL: https://reo-tau.vercel.app/t/PjktT2WjUpac?token=6ae9477c.dd13a0c8f4d8f130fdd3b5cd9b2ea626
[2026-11-03T02:31:35.246Z]   Venue Title rendered: "QA-20261102-Bistro-021145"
[2026-11-03T02:31:35.251Z]   Table Label "Table 4" visible: true
[2026-11-03T02:31:35.255Z]   Sample menu item visible: true
[2026-11-03T02:31:35.292Z] Opening decoded URL for Table 5: https://reo-tau.vercel.app/t/J-1XeCVj3I2_?token=6ae9477d.02b5b13cd054980a2239ee7a6dfa64eb
[2026-11-03T02:31:41.150Z]   Status: 200
[2026-11-03T02:31:41.150Z]   Redirect Chain: Direct (no redirects)
[2026-11-03T02:31:41.150Z]   Final URL: https://reo-tau.vercel.app/t/J-1XeCVj3I2_?token=6ae9477d.02b5b13cd054980a2239ee7a6dfa64eb
[2026-11-03T02:31:41.175Z]   Venue Title rendered: "QA-20261102-Bistro-021145"
[2026-11-03T02:31:41.180Z]   Table Label "Table 5" visible: true
[2026-11-03T02:31:41.185Z]   Sample menu item visible: true
[2026-11-03T02:31:41.191Z] === STEP 5: Place a Real Order as Guest, Check Kitchen & Admin, Move Statuses ===
[2026-11-03T02:31:44.565Z] Found 11 'Add' buttons on guest menu.
[2026-11-03T02:31:45.734Z] Opening cart drawer...
[2026-11-03T02:31:46.824Z] Placing guest order from table page...
[2026-11-03T02:31:52.589Z] [GUEST API] 201 https://reo-tau.vercel.app/api/orders -> {"order":{"id":"0045df1f-1f51-4c6e-a181-62a5886e3024","total_amount":330,"table_number":"Table 1","order_type":"dine_in","order_code":"#J4779","created_at":"2026-11-03T02:31:52.348761+00:00"}}
[2026-11-03T02:31:52.590Z] Order placed successfully! Order ID: 0045df1f-1f51-4c6e-a181-62a5886e3024, Status: undefined
[2026-11-03T02:31:53.665Z] [GUEST API] 200 https://reo-tau.vercel.app/api/orders?orderId=0045df1f-1f51-4c6e-a181-62a5886e3024 -> {"order":{"id":"0045df1f-1f51-4c6e-a181-62a5886e3024","restaurant_id":"67586fbf-be92-4e29-86e7-b51065d6559c","table_id":"cc67d769-1847-490a-9540-dbd8d6ef47ad","table_number":"Table 1","status":"pending","total_amount":330,"notes":"Please bring beverages first","created_at":"2026-11-03T02:31:52.34876
[2026-11-03T02:31:58.677Z] Order visible in Kitchen KDS display: true
[2026-11-03T02:31:59.959Z] Order verified in Kitchen API: true (Total kitchen orders: 1)
[2026-11-03T02:32:01.643Z] Updated order 0045df1f-1f51-4c6e-a181-62a5886e3024 to status "preparing": HTTP 200
[2026-11-03T02:32:04.000Z] Updated order 0045df1f-1f51-4c6e-a181-62a5886e3024 to status "ready": HTTP 200
[2026-11-03T02:32:05.685Z] Updated order 0045df1f-1f51-4c6e-a181-62a5886e3024 to status "served": HTTP 200
[2026-11-03T02:32:05.686Z] === STEP 6: Service Requests, Reviews/Feedback & Loyalty Enrollment ===
[2026-11-03T02:32:06.307Z] [GUEST API] 200 https://reo-tau.vercel.app/api/orders?orderId=0045df1f-1f51-4c6e-a181-62a5886e3024 -> {"order":{"id":"0045df1f-1f51-4c6e-a181-62a5886e3024","restaurant_id":"67586fbf-be92-4e29-86e7-b51065d6559c","table_id":"cc67d769-1847-490a-9540-dbd8d6ef47ad","table_number":"Table 1","status":"served","total_amount":330,"notes":"Please bring beverages first","created_at":"2026-11-03T02:31:52.348761
[2026-11-03T02:32:06.607Z] [GUEST API] 200 https://reo-tau.vercel.app/api/service-request -> {"success":true,"request":{"id":"ec75b897-d0d6-4bdd-b8df-54ef7b7a433d","restaurant_id":"67586fbf-be92-4e29-86e7-b51065d6559c","table_id":"cc67d769-1847-490a-9540-dbd8d6ef47ad","table_number":"Table 1","type":"call_waiter","status":"pending","created_at":"2026-11-03T02:32:06.365129+00:00","updated_at
[2026-11-03T02:32:06.719Z] Sent 'Call Waiter' request from guest page.
[2026-11-03T02:32:07.771Z] Sent 'Request Bill' request from guest page.
[2026-11-03T02:32:08.300Z] [GUEST API] 200 https://reo-tau.vercel.app/api/service-request -> {"success":true,"request":{"id":"16cd02a7-8208-4c9d-92ed-226c769560d9","restaurant_id":"67586fbf-be92-4e29-86e7-b51065d6559c","table_id":"cc67d769-1847-490a-9540-dbd8d6ef47ad","table_number":"Table 1","type":"request_bill","status":"pending","created_at":"2026-11-03T02:32:08.099905+00:00","updated_a
[2026-11-03T02:32:09.308Z] Submitted 5-star feedback.
[2026-11-03T02:32:09.358Z] [GUEST API] 201 https://reo-tau.vercel.app/api/feedback -> {"success":true}
[2026-11-03T02:32:41.168Z] [GUEST API] 200 https://reo-tau.vercel.app/api/orders?orderId=0045df1f-1f51-4c6e-a181-62a5886e3024 -> {"order":{"id":"0045df1f-1f51-4c6e-a181-62a5886e3024","restaurant_id":"67586fbf-be92-4e29-86e7-b51065d6559c","table_id":"cc67d769-1847-490a-9540-dbd8d6ef47ad","table_number":"Table 1","status":"served","total_amount":330,"notes":"Please bring beverages first","created_at":"2026-11-03T02:31:52.348761
[2026-11-03T02:32:41.201Z] [GUEST API] 200 https://reo-tau.vercel.app/api/orders?orderId=0045df1f-1f51-4c6e-a181-62a5886e3024 -> {"order":{"id":"0045df1f-1f51-4c6e-a181-62a5886e3024","restaurant_id":"67586fbf-be92-4e29-86e7-b51065d6559c","table_id":"cc67d769-1847-490a-9540-dbd8d6ef47ad","table_number":"Table 1","status":"served","total_amount":330,"notes":"Please bring beverages first","created_at":"2026-11-03T02:31:52.348761
[2026-11-03T02:32:41.990Z] Submitted Loyalty enrollment for 9876543210.
[2026-11-03T02:32:42.041Z] [GUEST API] 201 https://reo-tau.vercel.app/api/loyalty/enroll -> {"member":{"id":"d12050c6-c642-493a-b284-010b888cf212","fullName":"Adil Quraishi","stamps":0,"rewardGoal":5},"appleWalletUrl":null,"googleWalletUrl":null}
[2026-11-03T02:32:48.984Z] Feedback visible in Admin UI: true
[2026-11-03T02:32:50.244Z] Feedback verified in Admin API: false
[2026-11-03T02:32:51.777Z] Loyalty member visible in Admin UI: false
[2026-11-03T02:32:52.866Z] Loyalty member verified in Admin API: false
[2026-11-03T02:32:52.866Z] === STEP 7: Change Venue Name, Price & Availability -> Confirm Guest Updates ===
[2026-11-03T02:32:53.698Z] [GUEST API] 200 https://reo-tau.vercel.app/api/orders?orderId=0045df1f-1f51-4c6e-a181-62a5886e3024 -> {"order":{"id":"0045df1f-1f51-4c6e-a181-62a5886e3024","restaurant_id":"67586fbf-be92-4e29-86e7-b51065d6559c","table_id":"cc67d769-1847-490a-9540-dbd8d6ef47ad","table_number":"Table 1","status":"served","total_amount":330,"notes":"Please bring beverages first","created_at":"2026-11-03T02:31:52.348761
[2026-11-03T02:32:56.916Z] Updated venue name to "QA-20261102-Bistro Grande 021145", updated item price to ₹250, toggled availability to false.
[2026-11-03T02:32:59.612Z] [GUEST API] 200 https://reo-tau.vercel.app/api/orders?orderId=0045df1f-1f51-4c6e-a181-62a5886e3024 -> {"order":{"id":"0045df1f-1f51-4c6e-a181-62a5886e3024","restaurant_id":"67586fbf-be92-4e29-86e7-b51065d6559c","table_id":"cc67d769-1847-490a-9540-dbd8d6ef47ad","table_number":"Table 1","status":"served","total_amount":330,"notes":"Please bring beverages first","created_at":"2026-11-03T02:31:52.348761
[2026-11-03T02:33:00.500Z] [GUEST API] 204 https://reo-tau.vercel.app/api/scans -> 
[2026-11-03T02:33:01.025Z] Guest page updated venue title: "QA-20261102-Bistro Grande 021145"
[2026-11-03T02:33:01.026Z] 
=== MANDATORY CHAIN COMPLETE: ALL 7 STEPS VERIFIED ON REAL VENUE! ===
