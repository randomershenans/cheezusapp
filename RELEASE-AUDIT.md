# Release audit - Cheezus mobile app

**Date:** 21 July 2026  
**Scope:** the newly merged onboarding quiz, OAuth, signed-out conversion CTAs, share cards.  
**Method:** 6 independent audit lenses, every finding then attacked by a separate agent instructed to refute it. 47 findings survived; 17 were refuted and dropped.

> Findings are code-verified with file:line. Anything that could not be reproduced by reading the source was discarded.

---

## Blockers - do not submit with these (10)

### 1. Double-tap on any auto-advancing question crashes the quiz (index out of bounds)

`app/onboarding/quiz.tsx:161`  ·  _onboarding-correctness_

**Defect.** `handleSingleSelect` schedules an unguarded `setTimeout(goNext, 450)` per tap and the option components never disable after selection, so two taps inside 450ms run `goNext` twice against the same captured `questionIndex`, incrementing past the end of the array.

**How it fails.** On Q1 the user taps a tile and, seeing no immediate response, taps again (or taps the other tile to change their mind) within 450ms. Both timers were created by the same render, so both evaluate `questionIndex + 1 >= QUIZ_QUESTION_COUNT` with the stale index (false) and both call `setQuestionIndex(i => i + 1)`. On the last-but-one question this yields index 8; `QUIZ_QUESTIONS[8]` is `undefined`, and quiz.tsx:116 `selections[question.id]` throws `Cannot read property 'id' of undefined`. The screen crashes mid-onboarding; because nothing is persisted, relaunching restarts the quiz at Q1. QuestionPair.tsx:21-24 and QuestionChoice.tsx:20-23 both fire `onSelect` on every tap with no disabled/latched guard.

**Fix.** Latch the advance: keep a `advancingRef`/`useRef` that `handleSingleSelect` sets and the timer clears, ignore taps while set; store the timer id in a ref and clear it on unmount and before scheduling a new one; and make `goNext` use the functional form so it can't act on a stale index (`setQuestionIndex(i => i + 1 >= QUIZ_QUESTION_COUNT ? i : i + 1)` with finalize triggered off the committed index).


### 2. app_first_open is dead code — install/first-open is never recorded

`app/_layout.tsx:53`  ·  _measurement_

**Defect.** trackAppOpen is only ever called with isFirstOpen=false, and that flag is the sole trigger for the app_first_open event, so the top of the funnel emits nothing.

**How it fails.** A brand-new install cold-starts -> app/_layout.tsx:53 fires Analytics.trackAppOpen(false); lib/analytics.ts:486-488 emits app_first_open only when isFirstOpen is truthy, so the row is never written, and every app_open row carries is_first_open:false. The table contains zero app_first_open rows forever, so installs-to-signup conversion cannot be computed. Analytics.trackAppFirstOpen (lib/analytics.ts:611) has no call site anywhere in the repo.

**Fix.** Persist a first-run flag (AsyncStorage) in the mount effect at app/_layout.tsx:52-60 and pass isFirstOpen=true on the first cold start only; keep false for the AppState active handler at :56.


### 3. OAuth signups emit no signup event — Apple/Google users missing from acquisition counts

`app/auth/signup.tsx:39`  ·  _measurement_

**Defect.** Analytics.trackSignup is called from exactly one place, hardcoded to method 'email'; the Apple and Google paths emit no signup event at all.

**How it fails.** A new user taps Sign up with Google (app/auth/signup.tsx:180) -> OAuthButtons.handleGoogle (components/auth/OAuthButtons.tsx:34) -> AuthContext.signInWithGoogle (contexts/AuthContext.tsx:225). The account is created, but the only signup emitter is app/auth/signup.tsx:39 Analytics.trackSignup('email', undefined, undefined), and contexts/AuthContext.tsx contains zero Analytics references. Signup volume in the dashboard equals email signups only; social signups appear as pure activation with no acquisition row, so any signup-to-activation rate is computed on the wrong denominator.

**Fix.** Emit trackSignup('google'|'apple', inviteCode, userId) from AuthContext.signInWithGoogle/signInWithApple after signInWithIdToken succeeds and the profile row is known to be new (or from OAuthButtons using a new-user flag returned by the context), rather than only from the email screen.


### 4. Cancelled OAuth is recorded as oauth_success and routes the user as if signed in

`components/auth/OAuthButtons.tsx:40`  ·  _measurement_

**Defect.** signInWithGoogle/signInWithApple return normally when the user cancels, so the caller fires oauth_success and invokes onSuccess despite there being no session.

**How it fails.** User taps Continue with Google, then dismisses the Google sheet. contexts/AuthContext.tsx:253-254 returns silently on SIGN_IN_CANCELLED/IN_PROGRESS (Apple: :302 on ERR_REQUEST_CANCELED). Control returns to components/auth/OAuthButtons.tsx:40, which fires Analytics.trackOAuthSuccess('google', mode) and calls onSuccess?.() — app/auth/login.tsx:138 then router.replace('/(tabs)/profile'), landing a signed-out user on the signed-out profile branch (app/(tabs)/profile.tsx:391). Every abandoned OAuth attempt is counted as a successful one, so oauth_start-to-oauth_success is permanently ~100% and the real social-auth drop-off is unmeasurable. Via the sheet, components/auth/SignInPromptSheet.tsx:98 also logs signin_prompt_action 'oauth_success' for the same cancellation.

**Fix.** Have signInWithGoogle/signInWithApple return a discriminated result (e.g. {status:'cancelled'|'success'}) instead of undefined on cancel; in OAuthButtons fire trackOAuthCancelled (or oauth_failure with reason 'cancelled') and skip onSuccess unless a session actually exists.


### 5. OAuth cancellation is treated as a successful sign-up by every CTA

`components/auth/OAuthButtons.tsx:38`  ·  _signed-out-conversion_

**Defect.** `signInWithGoogle`/`signInWithApple` return normally (not throw) when the user cancels the native sheet (contexts/AuthContext.tsx:253-254 `if (err?.code === statusCodes.SIGN_IN_CANCELLED) return;` and :301 `if (err?.code === 'ERR_REQUEST_CANCELED' ...) return;`), so `OAuthButtons` falls straight through to `Analytics.trackOAuthSuccess(...)` and `onSuccess?.()` at :39-40 and :56-57 even though no session exists.

**How it fails.** Signed-out user taps the floating "+" on any tab, taps "Sign up with Google" in SignInPromptSheet, then hits Cancel in the Google sheet. `handleGoogle` resolves, fires `trackOAuthSuccess`, calls `onSuccess` -> SignInPromptSheet.tsx:96-100 dismisses and invokes `onAuthenticated` -> app/(tabs)/_layout.tsx:114 `router.push('/add-cheese')`. The user is still signed out and lands on the unguarded add-cheese screen; they fill in the whole form and only learn they aren't signed in when `supabase.auth.getUser()` throws 'Not authenticated' and surfaces as `Alert('Error','Failed to add cheese. Please try again.')` (app/add-cheese.tsx:303, :532). Same path from login.tsx:138 and signup.tsx:182 dumps them on the signed-out profile tab. Every cancelled attempt is also counted as an oauth_success, so the sign-up conversion metric is inflated by an unknown factor.

**Fix.** Make cancellation distinguishable: have `signInWithGoogle`/`signInWithApple` return a boolean (or throw a sentinel `CancelledError`) instead of a bare `return`, and in OAuthButtons only fire `trackOAuthSuccess` + `onSuccess` when a session actually exists. Cheapest defensive version: after `await signInWithGoogle()`, `const { data: { session } } = await supabase.auth.getSession(); if (!session) return;`


### 6. Account deletion is a "Coming Soon" stub — App Store Guideline 5.1.1(v) rejection

`app/settings/account.tsx:74`  ·  _auth-robustness_

**Defect.** Both delete-account entry points show a confirmation dialog and then an "Account deletion will be available soon" alert; no deletion is performed anywhere in the app or backend.

**How it fails.** App Review taps Profile > Settings > Account Settings > Delete Account > Delete, and gets Alert('Coming Soon','Account deletion will be available soon') (app/settings/account.tsx:74-76; identical stub at app/settings/privacy.tsx:245-247). The app supports account creation (email + Google + Apple), so Guideline 5.1.1(v) requires in-app account deletion. Verified there is no implementation: supabase/functions contains only profile-og-image, scan-cheese-label, send-push-notification, and no RPC or client code performs deletion. The dialog copy also claims data "will be permanently deleted", which is false. Additionally, because Sign in with Apple is offered, deletion must revoke the Apple credential (supabase.auth.signOut is the only auth teardown; nothing calls Apple token revocation or GoogleSignin.revokeAccess).

**Fix.** Implement a Supabase edge function that deletes the auth user + owned rows using the service role, call it from both settings screens, and revoke the Apple refresh token (and GoogleSignin.revokeAccess) before signing out.


### 7. Cancelling Apple sign-in is treated as a successful sign-in

`components/auth/OAuthButtons.tsx:57`  ·  _auth-robustness_

**Defect.** AuthContext.signInWithApple returns normally on user cancellation, so OAuthButtons fires trackOAuthSuccess and onSuccess() as though authentication had succeeded.

**How it fails.** User taps the Apple button and hits Cancel on the system sheet. AppleAuthentication.signInAsync rejects with ERR_REQUEST_CANCELED, which contexts/AuthContext.tsx:302 swallows with a bare `return` — the promise resolves. OAuthButtons.tsx:56-58 therefore runs Analytics.trackOAuthSuccess('apple', mode) and onSuccess?.() with no session. From login/signup that is router.replace('/(tabs)/profile') to the signed-out profile branch; from SignInPromptSheet with context 'add_cheese' ((tabs)/_layout.tsx:112-115) it dismisses the sheet and pushes /add-cheese, an unguarded route where the first save fails with the generic Alert('Error','Failed to add cheese…') (app/add-cheese.tsx:143-144). OAuth success analytics are also inflated by every cancellation. Same defect on the Google path via the silent returns at AuthContext.tsx:253-254.

**Fix.** Have signInWithGoogle/signInWithApple return a discriminated result (e.g. 'cancelled' | 'success') or throw a sentinel, and only call trackOAuthSuccess/onSuccess when a session actually exists.


### 8. Double-tap during quiz autoadvance overruns the question array and crashes the onboarding gate

`app/onboarding/quiz.tsx:161`  ·  _crash-risk_

**Defect.** handleSingleSelect schedules an unguarded `setTimeout(goNext, 450)` per tap with no debounce and no per-tap disable, so two taps inside the 450 ms window run `goNext` twice from the same stale `questionIndex`, incrementing past the last index and rendering `QUIZ_QUESTIONS[8]` as undefined.

**How it fails.** On Q7 (`adventurousness`, QuestionChoice — `components/onboarding/QuestionChoice.tsx:34` has no disabled state after selection) the user taps a card, then taps again (or taps a second card) ~100 ms later. Timer 1 fires: `questionIndex` 6 → 7. Timer 2 fires with the closure captured at `questionIndex === 6`, so `6 + 1 >= 8` is false and it runs `setQuestionIndex(i => i + 1)` on i=7 → 8. Next render, `quiz.tsx:115` sets `question = QUIZ_QUESTIONS[8]` (undefined, `QUIZ_QUESTION_COUNT = QUIZ_QUESTIONS.length = 8` per constants/QuizQuestions.ts:274) and `quiz.tsx:116` dereferences `question.id` → TypeError during render. The screen is inside `app/onboarding/_layout.tsx` with `gestureEnabled:false` and was reached via `replace`, so there is nothing to pop — a fatal JS error in the mandatory new-user gate.

**Fix.** Guard the advance: keep an `advancingRef` (or `useRef<NodeJS.Timeout>`) that ignores a second `handleSingleSelect` while a timer is pending, clear it in a `useEffect` cleanup, and clamp in `goNext` with `if (questionIndex >= QUIZ_QUESTION_COUNT - 1) return void finalize();` using a functional read of the latest index rather than the captured one.


### 9. No in-app account deletion — Apple 5.1.1(v) auto-rejection

`app/settings/account.tsx:75`  ·  _store-compliance_

**Defect.** Both account-deletion entry points are stubs that show a "Coming Soon" alert; the app creates accounts but offers no way to delete one.

**How it fails.** Reviewer taps Profile -> Settings -> Account Settings -> Danger Zone -> Delete Account -> Delete. `onPress` at account.tsx:73-77 runs `// TODO: Implement account deletion` and fires `Alert.alert('Coming Soon', 'Account deletion will be available soon')`. The identical stub exists at app/settings/privacy.tsx:246. Apple Guideline 5.1.1(v) requires apps that support account creation to support in-app account deletion; Google Play's Data deletion policy requires the same. This is a deterministic rejection, not a probabilistic one.

**Fix.** Implement real deletion: a Supabase edge function / RPC invoked with the user's JWT that hard-deletes the auth user and cascades profiles, cheese_box_entries, wishlists, follows, cheese_ratings, user_badges, user_taste_seed, user_privacy_settings, then `supabase.auth.signOut()` and `router.replace('/(tabs)')`. Both account.tsx:64 and privacy.tsx:236 should call the same handler.


### 10. Profile-picture camera flow is a non-functional placeholder that still requests camera permission

`components/ProfilePictureUpload.tsx:180`  ·  _store-compliance_

**Defect.** The camera capture screen renders an empty View instead of a camera preview, the ref is never attached, and the shutter button is permanently disabled — yet the flow prompts the user for camera access first.

**How it fails.** Reachable from app/(tabs)/profile.tsx:915. User taps the avatar -> "Take Photo": `requestCameraPermission` (ProfilePictureUpload.tsx:39-50) fires the OS camera permission dialog, then sets `isCameraMode`. `renderCamera` (:175-207) renders `<View style={{flex:1}} />` with the comment "Camera access is handled imperatively via the ref" — no `CameraView` is mounted anywhere in the repo, so `cameraRef` (:34) stays null forever. `setIsCameraReady` (:35) is never called, so the capture button's `disabled={loading || !isCameraReady}` (:188) is always true. Result: OS permission prompt, then a blank screen with a dead shutter and an X. Guideline 2.1 (non-functional feature) plus 5.1.1 (permission requested for a feature that does not exist).

**Fix.** Either mount `<CameraView ref={cameraRef} facing="front" onCameraReady={() => setIsCameraReady(true)} style={{flex:1}} />` (expo-camera v17 exports `CameraView`, not `Camera` — `Camera` at index.js:84 is only a permissions shim), or remove the "Take Photo" branch entirely and keep the working `pickImage` library path (:73-91).


---

## High (14)

### 1. The final quiz answer (Gouda vs Manchego) is always discarded

`app/onboarding/quiz.tsx:186`  ·  _onboarding-correctness_

**Defect.** `finalize` reads the `selections` binding captured by the render in which the tap occurred, but the last question's answer is written by `setSelections` in that very same handler, so the aggregated payload never contains Q8.

**How it fails.** On Q8 (`gouda_vs_manchego`, a `pair` question — constants/QuizQuestions.ts:249-271) the user taps Gouda. `handleSingleSelect` (quiz.tsx:158-162) calls `setSelections` then `setTimeout(goNext, 450)`. The scheduled `goNext` is the closure from the pre-update render, so `finalize` (quiz.tsx:186) calls `aggregateAnswers(selections)` with the object that has no `gouda_vs_manchego` key. The tiebreaker's `{family:'Hard', type:'Gouda', milk:'Cow', country:'Netherlands'}` is never written to `user_taste_seed`, and the same truncated object is passed to /onboarding/result (quiz.tsx:197-200), so the personality reveal is computed without it. This happens for 100% of completions — the question is pure theatre.

**Fix.** Compute the next selections map explicitly and thread it through: `const next = { ...selections, [question.id]: [opt] }; setSelections(next); setTimeout(() => goNext(next), 450);` and have `finalize(sel)` take the map as an argument instead of closing over state.


### 2. Quiz completion can be silently lost: the profiles mirror is warn-only and cannot detect a 0-row update

`lib/taste-seed-service.ts:81`  ·  _onboarding-correctness_

**Defect.** `saveTasteSeed` writes `profiles.onboarding_quiz_completed_at` with an `.update().eq()` whose failure is only logged, and a 0-row update (RLS mismatch / missing row) returns no error at all, so the user is treated as complete while the only flag the router guard reads stays null.

**How it fails.** A user finishes all 8 questions. The `user_taste_seed` upsert succeeds, but the `profiles` update at taste-seed-service.ts:81-84 matches zero rows (row not yet created by `handle_new_user`, or the update RLS policy rejects it). No error is returned, so not even the `console.warn` at :89 fires. The quiz navigates on happily. `skipOnboardingForSession()` is memory-only (AuthContext.tsx:126-128), so on the next cold start `hasCompletedOnboarding` is false; if the account is still inside `FRESH_SIGNUP_WINDOW_MS` (app/_layout.tsx:237,272) the guard replaces the user back into the full quiz they just finished. Beyond that window they escape the loop but `TuneYourFeedBanner` keeps nagging forever and nothing ever records completion. The comment at taste-seed-service.ts:88 claims "Router guard falls back to reading user_taste_seed" — it does not: app/_layout.tsx:258-262 selects only `created_at`, and AuthContext.tsx:100 reads only `profiles`.

**Fix.** Add `.select('id')` to the profiles update and treat an empty result as a failure; on failure either retry or surface it, and make the router guard actually fall back to `user_taste_seed.completed_at` as the comment claims.


### 3. onboarding_completed never fires — there is no single activation event

`lib/analytics.ts:617`  ·  _measurement_

**Defect.** Analytics.trackOnboardingCompleted is defined but has no call site, so the funnel has no canonical activation event and had_invite_code is never recorded anywhere.

**How it fails.** A user finishes the quiz: app/onboarding/quiz.tsx:189 fires quiz_completed only. A user skips: :224 fires quiz_skipped. A user who never sees the quiz (bypassed by the guard) fires neither. Nothing ever writes onboarding_completed, so 'onboarded users' must be reconstructed by unioning two mutually exclusive quiz events plus an unobservable third cohort, and the had_invite_code dimension the event was designed to carry is never populated (trackInviteConvertedSignup at lib/analytics.ts:555 also has zero call sites, and app/auth/signup.tsx:39 passes inviteCode undefined). Invite-driven activation cannot be attributed at all.

**Fix.** Call Analytics.trackOnboardingCompleted(method, hadInviteCode, user.id) at app/onboarding/quiz.tsx:189 (method 'quiz') and at :229 on the skip path (method 'skipped'), sourcing hadInviteCode from the stored pending invite code.


### 4. signup fires before email confirmation and no confirmation event exists

`app/auth/signup.tsx:39`  ·  _measurement_

**Defect.** The signup event is written immediately after supabase.auth.signUp returns, but the user has no session until they confirm by email, and no event marks that confirmation.

**How it fails.** User submits the email form -> app/auth/signup.tsx:39 writes signup -> :46 router.replace('/auth/login') with a 'check your email' alert. If the user never opens the confirmation email, the analytics row still says signup. The confirmation deep link (app/_layout.tsx:84-91) only does router.replace('/auth/login') and emits nothing, and app/auth/login.tsx:32 fires trackLogin() with no userId. So the single biggest known drop in the email funnel — signup submitted vs email confirmed — has no event on either side of it and cannot be measured.

**Fix.** Emit an email_confirmed (or onboarding_step_viewed('email_confirmed')) event from the confirmation deep-link branch at app/_layout.tsx:84-91, and pass the user id into trackLogin at app/auth/login.tsx:32 so confirmed logins can be joined back to the signup.


### 5. All acquisition events are written with user_id null

`app/auth/login.tsx:32`  ·  _measurement_

**Defect.** signup, login and all three oauth_* events are emitted without a userId, so lib/analytics.ts:368 stores user_id null and none of them can be joined to the user's later activity.

**How it fails.** app/auth/login.tsx:32 calls Analytics.trackLogin() with a comment claiming the user ID is 'tracked after auth state updates' — nothing anywhere does that (contexts/AuthContext.tsx has no Analytics calls). app/auth/signup.tsx:39 passes userId explicitly as undefined. components/auth/OAuthButtons.tsx:38,40,44,55,57,61 omit the userId argument entirely. trackEvent (lib/analytics.ts:368) writes user_id: userId || null. Consequence: you can see that N signups/logins happened but cannot cohort them — no signup-date cohort, no per-user path from oauth_success to quiz_completed to first cheese logged. Later events (quiz_started at app/onboarding/quiz.tsx:122) DO carry user id, so the two halves of the funnel live in disjoint identity spaces.

**Fix.** After the auth call resolves, read the id from the returned session (or have AuthContext expose it) and pass it to trackSignup/trackLogin/trackOAuthSuccess; for pre-auth events (oauth_start) keep an anonymous id and stamp it on both sides so they can be stitched.


### 6. Double-tapping a quiz option double-fires analytics and skips a question

`app/onboarding/quiz.tsx:161`  ·  _measurement_

**Defect.** Each tap on a single-select option schedules another setTimeout(goNext) with no in-flight lock, so two quick taps emit two quiz_question_answered events and advance the index twice.

**How it fails.** On question 1 the user taps 'funky' then immediately 'fresh' (or double-taps one tile). components/onboarding/QuestionPair.tsx:21-24 (same in QuestionChoice.tsx:22, QuestionGrid.tsx:27) calls onSelect on every press with no disabled state, and app/onboarding/quiz.tsx:158-162 schedules a fresh 450 ms timer per press. Both timers run goNext (:145): two quiz_question_answered rows for the same item_id/position, and two functional setQuestionIndex(i=>i+1) calls, so question 2 is never rendered or answered — its answer is missing from the aggregate and its position never appears in the data. On the last question both timers hit finalize (:148), producing two saveTasteSeed writes and two quiz_completed events, inflating the completion count and making per-question drop-off rates untrustworthy.

**Fix.** Guard the auto-advance with a ref (e.g. if (advancingRef.current) return; advancingRef.current = true) cleared on question change, store the timer id in a ref and clearTimeout on unmount, and add an early return in finalize when submitting is already true.


### 7. Search results push signed-out users into the unguarded /add-cheese route

`app/(tabs)/index.tsx:1020`  ·  _signed-out-conversion_

**Defect.** `renderAddCheesePrompt` is appended to every search result set unconditionally (`feed.push({ id: 'add-cheese-prompt', ... })` at :615) and its button does `router.push('/add-cheese')` with no `user` check, unlike the floating "+" which gates on auth in app/(tabs)/_layout.tsx:21-27.

**How it fails.** A signed-out user searches for a cheese that isn't in the catalogue, taps "+ Add New Cheese" at the bottom of the results, walks the whole add-cheese flow (photo upload, name, producer, rating), then on submit gets `Alert('Error','Failed to add cheese. Please try again.')` from app/add-cheese.tsx:532 because `supabase.auth.getUser()` returned null at :303. No sign-up prompt is ever shown and all their input is lost — the single highest-intent moment in the signed-out funnel converts to nothing.

**Fix.** Mirror the tab-bar gate: in `renderAddCheesePrompt`, if `!user` open a `SignInPromptSheet context="add_cheese"` (with `onAuthenticated` -> `router.push('/add-cheese')`) instead of navigating. Additionally add a `!user` guard at the top of app/add-cheese.tsx that renders the prompt rather than the form.


### 8. Google sign-in cancellation surfaces as an error alert (SDK v16 no longer throws on cancel)

`contexts/AuthContext.tsx:239`  ·  _auth-robustness_

**Defect.** The code expects GoogleSignin.signIn() to reject with statusCodes.SIGN_IN_CANCELLED, but @react-native-google-signin/google-signin v16 resolves with { type: 'cancelled', data: null }, which falls through to the missing-id_token throw.

**How it fails.** User taps "Continue with Google" then dismisses the account chooser. Installed version is ^16.1.2 and node_modules/@react-native-google-signin/google-signin/lib/typescript/src/signIn/GoogleSignin.d.ts declares `signIn(): Promise<SignInSuccessResponse | CancelledResponse>` with CancelledResponse = { type: 'cancelled'; data: null } (types.d.ts:126-129). At AuthContext.tsx:242 `result?.data ?? result` collapses the null data back to the response object, idToken is undefined, and line 245 throws 'Google Sign In did not return an id_token'. That is not a statusCodes error, so line 256 rethrows and OAuthButtons.tsx:45 shows Alert('Sign in failed','Google Sign In did not return an id_token') plus a trackOAuthFailure event — for a plain user cancel.

**Fix.** Check `if (result?.type === 'cancelled') return;` before reading data, and read the token as `result.data.idToken`.


### 9. Google button is always rendered even when Google sign-in is unconfigured, and the failure leaks the env var name

`components/auth/OAuthButtons.tsx:90`  ·  _auth-robustness_

**Defect.** The Google button renders unconditionally on every auth surface, but GoogleSignin.configure is skipped when EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is empty; pressing it then shows an alert containing the raw env var name.

**How it fails.** AuthContext.tsx:18 only configures the SDK when GOOGLE_WEB_CLIENT_ID is non-empty, and :233-235 throws 'Google Sign In is not configured (missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).' — rendered verbatim by OAuthButtons.tsx:43-45 as a user-facing alert on login, signup and SignInPromptSheet. Neither .env nor .env.local in the repo defines EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID or EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID (they contain only VITE_SUPABASE_* keys) and eas.json declares no `env` block for any profile, so any build without those EAS secrets ships a visible, permanently broken Google button. The same gap applies to app.config.js:124, where iosUrlScheme falls back to "com.googleusercontent.apps.PLACEHOLDER" when GOOGLE_IOS_URL_SCHEME is unset, so the iOS flow cannot redirect back into the app.

**Fix.** Export a `googleSignInAvailable` flag from AuthContext (Platform !== 'web' && !!GOOGLE_WEB_CLIENT_ID) and hide the button when false; replace the thrown message with user-facing copy; add the client IDs to eas.json env or fail the build when they are missing.


### 10. Onboarding result screen never mounts ShareCardHost, so the taste-result card image is never generated

`app/onboarding/result.tsx:68`  ·  _crash-risk_

**Defect.** `shareTasteResult` calls `generateAndShare('taste_result', …)` but ResultScreen renders no `<ShareCardHost/>`, and no other mounted screen provides one, so `getHost()` in lib/shareCard.ts:46-59 always times out and the flagship share silently degrades to plain text.

**How it fails.** User finishes the quiz, lands on /onboarding/result, taps "Share my taste". `lib/shareCard.ts:113` awaits `getHost()`, which has no `registeredHost` (the only mounts are components/ShareProfileCard.tsx:115, components/SharePromptModal.tsx:117, components/MilestoneSharePrompt.tsx:199 and app/badges.tsx:352 — none is in this tree). After a 1500 ms dead wait it rejects with 'ShareCardHost not mounted', `Analytics.trackShareCardRenderFailed` fires, and the user gets a bare text share sheet 1.5 s after tapping. The TasteResultCard is never rendered for any user, and the failure is invisible except in analytics.

**Fix.** Render `<ShareCardHost />` in ResultScreen (alongside the actions block), and pass `userId`/`userHandle` into the card props so the copy-variant seed and share analytics resolve.


### 11. Android share cards never attach the captured image

`lib/shareCard.ts:146`  ·  _crash-risk_

**Defect.** After a successful capture, the image URI is only passed on iOS (`url: Platform.OS === 'ios' ? imageUri ?? fb.url : fb.url`), and React Native's `Share.share` ignores `url` on Android entirely — so every Android share is text-only despite paying the full render+capture cost.

**How it fails.** An Android user logs a 5-star cheese, SharePromptModal opens, taps "Share Cheese". `generateAndShare` renders and rasterizes the 1080x1920 PNG via `components/share-cards/ShareCardRenderer.tsx:61`, then discards `imageUri` and calls `Share.share({message, url: 'https://cheezus.co'})`. Android's Share module supports only `message`/`title`, so the user posts a plain text line. `Analytics.trackShareCardImageShared` still records it as an image share, so the metric silently overstates card distribution on the whole Android base.

**Fix.** On Android use expo-sharing (`Sharing.shareAsync(imageUri, { mimeType: 'image/png' })`) or an intent with the content:// URI; skip the capture entirely if you intend to stay text-only there.


### 12. ShareCardHost registration is a global singleton with unconditional unregister, so closing one host disables another that is still mounted

`components/share-cards/ShareCardHost.tsx:79`  ·  _crash-risk_

**Defect.** `registerShareCardHost(host)` (lib/shareCard.ts:37-44) overwrites the module-level `registeredHost` unconditionally, and the unmount cleanup calls `registerShareCardHost(null)` without checking that the host being torn down is the one currently registered.

**How it fails.** A user with zero followers is on the Profile tab, where `components/ShareProfileCard.tsx:115` mounts host A (registered). They log a cheese; `components/SharePromptModal.tsx:117` mounts host B, which overwrites the registration. The modal dismisses, B unmounts and sets `registeredHost = null` — but A is still mounted and its `useEffect` (deps `[generate]`, a stable useCallback) never re-runs. Back on the profile, "Share Profile" now waits the full 1500 ms in `getHost()`, rejects, and silently falls back to a text share with no card, for the rest of the session.

**Fix.** Ref-count or identity-check: `if (registeredHost === host) registeredHost = null;` in the cleanup, and have hosts re-register on focus (or hoist a single host into app/_layout.tsx and drop the per-screen mounts).


### 13. Microphone permission declared and requested but never used

`app.config.js:30`  ·  _store-compliance_

**Defect.** NSMicrophoneUsageDescription and Android RECORD_AUDIO ship in the binary while no code in the app records audio or video.

**How it fails.** app.config.js:30 declares NSMicrophoneUsageDescription ("Cheezus may use the microphone when recording video of cheese tastings") and the expo-camera plugin repeats it at :108, which is what put `<uses-permission android:name="android.permission.RECORD_AUDIO"/>` into android/app/src/main/AndroidManifest.xml:9. Grepping app/, components/, lib/, contexts/ and hooks/ for `recordAsync`, `videoQuality`, `expo-av`, `Audio.` and `CameraView` returns nothing — there is no recording surface at all. Apple 5.1.1 rejects purpose strings for unused data access, and the hedge word "may" is itself a common rejection reason; Play flags RECORD_AUDIO in the Data safety review.

**Fix.** Drop `NSMicrophoneUsageDescription` from ios.infoPlist and remove `microphonePermission` from the expo-camera plugin config (app.config.js:108), then re-prebuild Android so RECORD_AUDIO is dropped from the manifest.


### 14. Committed android/ project pins versionName 1.0.1 / versionCode 1, contradicting app.config.js and package.json

`android/app/build.gradle:103`  ·  _store-compliance_

**Defect.** Three different versions exist across the repo and the checked-in native Android project — which EAS uses instead of prebuilding — carries the oldest one.

**How it fails.** android/app/build.gradle:103-104 sets `versionCode 1` / `versionName "1.0.1"`. app.config.js:7,38 says `version: "1.0.3"` / `versionCode: 12`. package.json:3 says `"version": "1.0.0"`. Because android/ is tracked in git (`git ls-files android` returns the full project, and there is no ios/ dir), EAS Build skips prebuild for Android and compiles the committed project — so the app.config.js Android values are inert. `appVersionSource: "remote"` in eas.json manages versionCode only, not versionName, so the Play listing ships as 1.0.1 while iOS ships as 1.0.3. If remote versioning is ever disabled, versionCode 1 is rejected by Play as already used.

**Fix.** Pick one source of truth: either delete android/ and let prebuild run from app.config.js, or sync build.gradle to versionName "1.0.3" and keep the native project authoritative. Align package.json:3 either way.


---

## Medium (18)

### 1. No persistence of in-progress answers; Android hardware back exits the app and loses everything

`app/onboarding/quiz.tsx:109`  ·  _onboarding-correctness_

**Defect.** `selections` lives only in component state — there is no AsyncStorage write anywhere under app/onboarding or components/onboarding — and the quiz is entered via `router.replace`, so Android back pops an empty stack.

**How it fails.** A user is on Q6 of 8, switches to another app, and iOS/Android reclaims the process; or on Android they press the hardware back button expecting to return to the previous question (the on-screen back chevron exists at QuizProgressBar.tsx:21-25, so back is an established affordance here). There is no `BackHandler` registration and `gestureEnabled:false` (app/onboarding/_layout.tsx:15) only blocks the iOS swipe. The guard arrived via `router.replace('/onboarding/quiz')` (app/_layout.tsx:293) so there is nothing to pop and the app closes. On relaunch all six answers are gone and the quiz restarts at Q1.

**Fix.** Persist `{questionIndex, selections}` to AsyncStorage on every change and rehydrate on mount; register a `BackHandler` listener that maps hardware back to `goBack()` and returns `true` at index 0 (or routes to skip).


### 2. Pair-question selection highlight leaks between questions

`components/onboarding/QuestionPair.tsx:19`  ·  _onboarding-correctness_

**Defect.** `QuestionPair` holds its own `selectedIdx` state and receives no `selected` prop, so React reuses the same instance across consecutive pair questions and carries the previous question's highlight over.

**How it fails.** Q2 (`funky_or_fresh`) and Q3 (`soft_or_hard`) are both `type: 'pair'` and render at the same position in the tree (quiz.tsx:293 `<View style={styles.body}>{renderBody()}</View>`), so React reconciles them as the same component and preserves `selectedIdx`. The user picks the top tile on Q2; Q3 fades in with its top tile already outlined in the primary colour as though answered. Conversely, tapping the back chevron (QuizProgressBar.tsx:21) to revisit an answered question shows a highlight unrelated to what is actually stored in `selections`, so the user cannot see what they previously chose.

**Fix.** Pass the parent's `currentSelections` into QuestionPair/QuestionChoice/QuestionGrid as a controlled `selected` prop (as QuestionMulti/QuestionChips already are), or at minimum add `key={question.id}` at the renderBody call site to force a remount per question.


### 3. Signed-out CTA impressions are never tracked, so conversion rate has no denominator

`components/auth/SignedOutCTABanner.tsx:37`  ·  _measurement_

**Defect.** The signed-out banner and the inline feed card emit only a tap event; neither emits a shown event, so CTR of the primary signed-out conversion surface cannot be computed.

**How it fails.** A signed-out user scrolls the feed: app/(tabs)/index.tsx:1112 renders SignedOutCTABanner and :1123-1125 injects an InlineSignUpCard every fifth row. components/auth/SignedOutCTABanner.tsx:36-39 fires signed_out_cta_tapped only on press; components/auth/InlineSignUpCard.tsx:43-46 likewise. There is no impression event on either (contrast components/TuneYourFeedBanner.tsx:77-82, which does fire tune_feed_banner_shown once per mount). So signed_out_cta_tapped counts cannot be turned into a rate, and the four copy variants keyed as feed_inline_${variantIndex} (InlineSignUpCard.tsx:44) cannot be compared because impressions per variant are unknown.

**Fix.** Mirror the TuneYourFeedBanner pattern: a once-per-mount effect firing a signed_out_cta_shown event with the same placement / feed_inline_${variantIndex} key in both components.


### 4. trackOnboardingStepViewed is unused — no step-view events in the onboarding flow

`lib/analytics.ts:614`  ·  _measurement_

**Defect.** The per-step view event has zero call sites; the quiz emits only answer events and the result screen emits nothing on view, so intra-onboarding drop-off must be inferred backwards from answers.

**How it fails.** A user is routed to /onboarding/quiz, sees question 4 and quits. quiz_question_answered (app/onboarding/quiz.tsx:146) fires only in goNext, i.e. on leaving a question, so a question that is viewed-but-not-answered produces no row at all and is indistinguishable from a question never reached when a preceding double-advance skipped it (see the double-tap finding). The result screen (app/onboarding/result.tsx:100-148) emits nothing on mount — the only event is first_feed_view_after_quiz at :137 when the user taps See your feed — so users who abandon during the 2.4 s TasteRevealAnimation (:141-148) versus on the result content itself are the same bucket. No auth screen emits a view event either.

**Fix.** Call Analytics.trackOnboardingStepViewed(question.id, user?.id) in the question-change effect at app/onboarding/quiz.tsx:126-143 and once on mount of app/onboarding/result.tsx with step 'result'.


### 5. session_id resets on every foreground, breaking session-level funnel stitching

`lib/analytics.ts:484`  ·  _measurement_

**Defect.** trackAppOpen calls resetSession(), and app/_layout.tsx fires it on every AppState 'active', so returning to the app mid-funnel starts a new session_id.

**How it fails.** A signed-out user taps the CTA (signed_out_cta_tapped, user_id null), taps Sign up with email, leaves for their mail app to confirm, and comes back. app/_layout.tsx:54-58 fires trackAppOpen on AppState 'active' -> lib/analytics.ts:484 resetSession() -> a new session_id from :226-227. Since all pre-auth events carry user_id null (see the null-user_id finding), session_id is the only join key, so the pre-departure and post-return halves of the signup funnel land in different sessions and cannot be linked. Session counts are also inflated by every app switch, so any per-session rate is understated.

**Fix.** Only reset the session when the app has been backgrounded past a threshold (e.g. 30 minutes) — track the background timestamp in the AppState handler at app/_layout.tsx:54 and pass a flag into trackAppOpen instead of resetting unconditionally.


### 6. The onboarding share action is untracked and its share-card events are anonymous

`app/onboarding/result.tsx:132`  ·  _measurement_

**Defect.** onShare emits no event of its own, passes no userId into generateAndShare, and the text fallback path emits nothing at all.

**How it fails.** A user taps Share my taste on the result screen. app/onboarding/result.tsx:132-134 fires no analytics, then shareTasteResult (:46) calls generateAndShare('taste_result', {tagline, flavorTags, fingerprint}) at :68-72 with no userId key — lib/shareCard.ts:107 reads props?.userId, so share_card_rendered (:115) and share_card_image_shared (:125,151) are written with user_id null. If the dynamic import fails or generateAndShare throws, result.tsx:79-83 falls back to a bare Share.share with no event whatsoever. Net effect: taps on the strongest viral-loop action in onboarding are invisible, and the shares that are recorded cannot be attributed to the user who made them.

**Fix.** Fire a share_prompt_tapped (or trackShareCardImageShared-adjacent tap event) at app/onboarding/result.tsx:133 with user?.id, add userId: user?.id to the props object at :68-72, and emit an event in the text-fallback branch at :80.


### 7. Cheezopedia bookmark button is silently disabled for signed-out users with no sign-up path

`app/cheezopedia/[id].tsx:226`  ·  _signed-out-conversion_

**Defect.** The bookmark action is `disabled={!user || savingBookmark}` and `toggleBookmark` early-returns on `if (!user ...)` (:120), so a signed-out reader gets a visible but inert control and no conversion prompt — even though `SignInPromptSheet` already ships a `save_article` copy variant (components/auth/SignInPromptSheet.tsx:39) that is never used anywhere in the app.

**How it fails.** Signed-out user opens an article or recipe from the feed, taps the bookmark icon in the header — nothing happens, no alert, no sheet, no visual change. They have no way to discover that saving requires an account, and the screen offers no other sign-up affordance. Verified: `grep context="` shows only add_cheese, follow and generic are ever passed; save_article, rate, wishlist and share_profile are dead copy.

**Fix.** Remove `!user` from `disabled` and, in `toggleBookmark`, show `SignInPromptSheet context="save_article"` when `!user`, with `onAuthenticated` re-running the bookmark write so the intent isn't lost.


### 8. Follow intent is discarded after successful sign-up on a public profile

`app/profile/[id].tsx:256`  ·  _signed-out-conversion_

**Defect.** `handleToggleFollow` opens the sheet when `!user` (:94-96), but the `SignInPromptSheet` at :255-259 passes no `onAuthenticated`, so `SignInPromptSheet.tsx:96-100` merely dismisses after OAuth and the follow the user asked for is never written.

**How it fails.** Signed-out user arrives from a shared profile deep link (`@handle` / `profile/:id`), taps Follow, completes Google/Apple sign-up in the sheet. The sheet closes and they are left on the profile with the button still reading "Follow" — the follow was never inserted into `follows`. This is the exact viral-loop step (shared profile -> new user -> follow edge) and it drops the edge every time.

**Fix.** Pass `onAuthenticated={() => { setSignInPromptVisible(false); handleToggleFollow(); }}` (or set a `pendingFollow` flag consumed by an effect once `user` becomes non-null, since `handleToggleFollow` closes over the stale `user`).


### 9. "Sign Up" buttons on producer-cheese detail route to the login screen

`app/producer-cheese/[id].tsx:676`  ·  _signed-out-conversion_

**Defect.** Both signed-out alerts ("Join Cheezus! Create a free account...") offer a button labelled `Sign Up` whose handler is `router.push('/auth/login')` — at :676 and again at :703 — sending a user who has no account to the log-in form. The same inversion exists at app/cheese/[id].tsx:179, where `handleAddToCheeseBox` pushes `/auth/login` with no explanatory copy at all.

**How it fails.** Signed-out user on a producer cheese page taps "Add to Cheese Box", reads an alert inviting them to create a free account, taps "Sign Up", and lands on a screen headed "Log In" asking for an email and password they don't have. They must spot the secondary "Create Account" button (app/auth/login.tsx:143) to continue. On app/cheese/[id].tsx the jump to the login form happens with no alert or explanation whatsoever.

**Fix.** Replace both alerts and the cheese/[id].tsx push with `SignInPromptSheet` using the existing `rate` / `wishlist` contexts, which already offer OAuth plus "Sign up with email", and keep the user in place with an `onAuthenticated` that resumes the action.


### 10. Login screen's close and "Maybe Later" wipe the navigation stack

`app/auth/login.tsx:53`  ·  _signed-out-conversion_

**Defect.** Both the X (`:53`) and "Maybe Later" (`:152`) call `router.replace('/')`, and successful login always does `router.replace('/(tabs)/profile')` (`:32`), so the screen the user was converting from is destroyed in every outcome.

**How it fails.** Signed-out user browsing `/cheese/<id>` taps "Add to Cheese Box" and is pushed to `/auth/login` (app/cheese/[id].tsx:179). If they back out, `replace('/')` drops them on the home feed instead of returning to the cheese; if they log in, `replace('/(tabs)/profile')` drops them on the profile tab. Either way the cheese they were about to log is gone and they must search for it again — the action that motivated the sign-in is never completed.

**Fix.** Use `router.back()` for the close/"Maybe Later" affordances, and carry a `redirect` / `next` param through the login route so `handleLogin` and `OAuthButtons.onSuccess` return to the originating screen instead of hard-coding `/(tabs)/profile`.


### 11. Sign-out never clears the native Google session, so the next Google sign-in silently reuses the old account

`contexts/AuthContext.tsx:216`  ·  _auth-robustness_

**Defect.** signOut removes the push token and calls supabase.auth.signOut but never calls GoogleSignin.signOut(), leaving the native SDK's cached Google account.

**How it fails.** User A signs out and hands the phone to User B, who taps "Continue with Google". GoogleSignin still holds User A's cached credential (GoogleSignin.signOut/revokeAccess exist in the installed SDK surface but are never referenced anywhere in app/, components/, lib/ or contexts/ — the only GoogleSignin calls are configure, hasPlayServices and signIn at AuthContext.tsx:20/238/239), so the picker can be skipped and User B is signed straight back into User A's Cheezus account.

**Fix.** In signOut, `if (Platform.OS !== 'web' && GOOGLE_WEB_CLIENT_ID) await GoogleSignin.signOut().catch(() => {})` before supabase.auth.signOut().


### 12. Concurrent generate() calls orphan the earlier promise, which never settles

`components/share-cards/ShareCardHost.tsx:39`  ·  _crash-risk_

**Defect.** `generate` stores the promise's resolve/reject inside `pending` state; a second call replaces `pending` and the effect cleanup only clears the timer, so the first call's `resolve`/`reject` are never invoked and its awaiter hangs forever.

**How it fails.** User double-taps "Share Cheese" in SharePromptModal (the button has no disabled state, components/SharePromptModal.tsx:107). Call 1 sets pending₁; call 2 sets pending₂; the effect cleanup for pending₁ runs `cancelled = true; clearTimeout(t)` (ShareCardHost.tsx:69-72) and nothing ever calls `pending₁.reject`. The `await host.generate(...)` inside `lib/shareCard.ts:114` for call 1 never resolves, so its `try` block never completes, `onDismiss()` for that path never runs, and the promise leaks. Any caller that sets a loading flag before awaiting would be stuck in that state permanently.

**Fix.** In the effect cleanup, reject the superseded pending (`pending.reject(new Error('superseded'))`), and guard `generate` so it queues or rejects immediately when a capture is already in flight; disable the share buttons while awaiting.


### 13. Autoadvance timer is never cleared on unmount, and the last question can run finalize twice

`app/onboarding/quiz.tsx:161`  ·  _crash-risk_

**Defect.** `setTimeout(goNext, AUTOADVANCE_DELAY_MS)` is never captured or cleared, so it survives the `router.replace` out of the quiz; on the final question two queued timers each call `finalize()`.

**How it fails.** On Q8 (`gouda_vs_manchego`) the user taps both tiles in quick succession. Both timers evaluate `questionIndex + 1 >= 8` as true and both call `finalize()` (quiz.tsx:147-148): two concurrent `saveTasteSeed` upserts, two `trackQuizCompleted` events (inflating the completion metric), two `refreshOnboardingStatus` fetches and two `router.replace` calls to /onboarding/result. If the user instead taps once and the save is slow, the pending timer fires after navigation and calls `setQuestionIndex`/`Analytics` on an unmounted screen.

**Fix.** Store the timer in a ref, clear it in a `useEffect(() => () => clearTimeout(ref.current), [])`, and early-return from `finalize` when `submitting` is already true.


### 14. Skipped/failed profile mirror leaves 'completed' state that only exists in memory, contradicting its own comment

`lib/taste-seed-service.ts:88`  ·  _crash-risk_

**Defect.** The profile-mirror update is warn-only and the comment claims 'Router guard falls back to reading user_taste_seed' — it does not; app/_layout.tsx and contexts/AuthContext.tsx:100 read `profiles.onboarding_quiz_completed_at` exclusively, so a failed mirror means the quiz replays.

**How it fails.** User completes the quiz. `user_taste_seed` upserts fine, but the `profiles` update at lib/taste-seed-service.ts:81-84 fails (RLS, transient 5xx). The warn is logged, `finalize` proceeds, and `skipOnboardingForSession()` (in-memory only, contexts/AuthContext.tsx:126-128) carries the user through the rest of the session. On the next cold start `hasCompletedOnboarding` is false and — if the account is still inside the 10-minute freshness window — the guard replaces them into the full 8-question quiz they already finished. `handleSkip` produces the same state by design (skipped=true writes no timestamp).

**Fix.** Either retry/await the profile mirror and surface failure, or make the guard actually consult `user_taste_seed.completed_at` as the comment claims; persist the skip flag to AsyncStorage instead of component-lifetime state.


### 15. No privacy policy or terms link anywhere in the app

`app/settings/privacy.tsx:344`  ·  _store-compliance_

**Defect.** Grepping the whole app for privacy-policy/terms URLs returns zero hits; the "Privacy & Security" screen links to nothing external.

**How it fails.** The Data & Privacy section (privacy.tsx:343-356) offers only a data export. Signup (app/auth/signup.tsx) presents no terms/privacy consent text before account creation. The app collects location, photos, email, and social graph data. Apple requires the privacy policy to be accessible within the app for apps with accounts, and Play requires an in-app privacy policy link for apps handling personal data. A reviewer cannot find one.

**Fix.** Add a "Privacy Policy" and "Terms of Service" row in privacy.tsx opening https://cheezus.co/privacy and /terms via expo-web-browser, and add the same links under the signup button in app/auth/signup.tsx.


### 16. Google sign-in logo loaded from a remote URL on every auth surface

`components/auth/OAuthButtons.tsx:28`  ·  _store-compliance_

**Defect.** The Google "G" mark is fetched from developers.google.com at render time instead of being bundled, so the button renders logo-less offline or on a restricted network.

**How it fails.** `GOOGLE_LOGO_URI = 'https://developers.google.com/identity/images/g-logo.png'` (OAuthButtons.tsx:28) is used as `<Image source={{ uri: GOOGLE_LOGO_URI }} />` (:100). OAuthButtons renders on app/auth/login.tsx:136, app/auth/signup.tsx:180 and components/auth/SignInPromptSheet.tsx:93. In airplane mode, on a captive-portal Wi-Fi, or behind a corporate proxy the image silently fails and the button shows only text — which also violates Google's sign-in branding guidelines requiring the mark be displayed. Reviewers commonly test the offline state.

**Fix.** Bundle the asset (assets/images/google-logo.png) and use `source={require('@/assets/images/google-logo.png')}`.


### 17. Dead and placeholder routes registered by Expo Router and deep-linkable in production

`app/add-cheese-old.tsx:21`  ·  _store-compliance_

**Defect.** Three unreferenced screens — a superseded add-cheese implementation, a stray SplashScreen, and a placeholder tab reading "Add Screen (Hidden)" — become live routes because every file under app/ is a route.

**How it fails.** `app/add-cheese-old.tsx` (204 lines, a full second AddCheeseScreen) has zero inbound references; `app/SplashScreen.tsx` (57 lines) is likewise unreferenced — app/_layout.tsx:5 imports `SplashScreen` from expo-router, not this file. `app/(tabs)/add.tsx:9` renders the literal text "Add Screen (Hidden)" and is registered as a Tabs.Screen at app/(tabs)/_layout.tsx:64-71 with `tabBarButton: () => null`; hiding the button does not unregister the route. With `scheme: "cheezus"` and the catch-all `<data android:scheme="cheezus"/>` intent filter (AndroidManifest.xml:34), `cheezus://add-cheese-old`, `cheezus://SplashScreen` and `cheezus://add` all resolve. `cheezus://add` shows unstyled debug text — placeholder UI in a shipped build (Guideline 2.1). There is also a stray app/cheese/new.tsx.fixed.

**Fix.** Delete app/add-cheese-old.tsx, app/SplashScreen.tsx and app/cheese/new.tsx.fixed. For the hidden tab, keep the file but make it `return <Redirect href="/(tabs)" />` instead of rendering debug text.


### 18. Android push notifications silently dead — no google-services.json

`lib/push-notifications.ts:58`  ·  _store-compliance_

**Defect.** expo-notifications is wired up and prompts for permission on Android, but FCM is unconfigured so token registration always fails and is swallowed.

**How it fails.** components/PushNotificationHandler.tsx:24 calls `registerForPushNotifications(user.id)` for every signed-in user. On Android that prompts for POST_NOTIFICATIONS (push-notifications.ts:39) and then calls `getExpoPushTokenAsync` (:58), which requires FCM credentials. `android/app/google-services.json` does not exist and neither app.config.js nor android/app/build.gradle applies the `com.google.gms.google-services` plugin. The throw is caught at :74 and logged as "Push notifications not available", so the user grants notification permission and then never receives a push. Requesting a permission the app cannot act on is a 5.1.1 risk and a broken feature.

**Fix.** Add google-services.json plus `googleServicesFile` in app.config.js android config and upload the FCM V1 service account key to EAS; or gate `registerForPushNotifications` off on Android until FCM is configured so no permission is requested.


---

## Low (5)

### 1. quiz_started carries no source, so forced and voluntary quiz entries are indistinguishable

`app/onboarding/quiz.tsx:122`  ·  _measurement_

**Defect.** The quiz has two entry points but the start event has no property recording which one was used.

**How it fails.** quiz_started fires once per mount at app/onboarding/quiz.tsx:119-123 with only a user id. Entry A is the forced router.replace at app/_layout.tsx:293; entry B is the voluntary router.push from components/TuneYourFeedBanner.tsx:88. These have very different expected completion rates, but both write identical rows, so a blended completion rate is the only thing computable and neither entry point can be optimised.

**Fix.** Pass an entry param on both navigations and include it in trackQuizStarted (extend lib/analytics.ts:647 to accept a source string).


### 2. Google logo is fetched from developers.google.com on every auth screen render

`components/auth/OAuthButtons.tsx:28`  ·  _auth-robustness_

**Defect.** The Google mark is a remote <Image> URI rather than a bundled asset, so it fails to draw offline and makes a third-party network request on every auth surface.

**How it fails.** A user opens the login screen on a poor connection or in airplane mode: the Image at OAuthButtons.tsx:100 pointing at https://developers.google.com/identity/images/g-logo.png (:28) never loads, leaving a white button with only text on a white background (backgroundColor '#FFFFFF' at :154) and a 20x20 gap. It also emits an unnecessary request to Google before the user has consented to anything.

**Fix.** Bundle the g-logo asset under assets/images and require() it.


### 3. PassportMap emits duplicate React keys and stacked markers when aliased country names co-occur

`components/profile/PassportMap.tsx:41`  ·  _crash-risk_

**Defect.** Dots are keyed by the resolved centroid name, but `findCentroid` maps aliases onto the same centroid (lib/country-centroids.ts:73-81), so two distinct `origin_country` spellings collapse into two dots with an identical `name`.

**How it fails.** A user's cheese box contains entries whose `producer_cheese_stats.origin_country` is 'UK' for some and 'United Kingdom' for others. The RPC groups by the raw column (db/public-profile-rpc.sql:83-87) and returns both rows. `loggedDots` then holds two entries both named 'United Kingdom' at identical coordinates, producing a duplicate-key warning at PassportMap.tsx:87/136, two overlapping MarkerViews with different counts, and a fallback chip list showing the same country twice with split counts.

**Fix.** Merge dots by centroid identity in the `useMemo` (accumulate counts into a Map keyed by `centroid.name`) before rendering.


### 4. Google logo on every auth surface is fetched from developers.google.com at render time

`components/auth/OAuthButtons.tsx:28`  ·  _crash-risk_

**Defect.** `GOOGLE_LOGO_URI` is a remote URL rendered inside the Google button on login, signup and SignInPromptSheet; offline or when the host is unreachable the button renders with an invisible icon and no fallback.

**How it fails.** A user opens the app on a poor connection and taps the sign-in sheet. The `<Image source={{uri: 'https://developers.google.com/identity/images/g-logo.png'}}>` at OAuthButtons.tsx:100 fails to load, leaving a blank gap next to 'Continue with Google'. It also creates a third-party network request on every auth surface, which is an avoidable privacy/latency cost and a hot-linked asset Google can change or block.

**Fix.** Bundle the mark under assets/images/ and `require()` it, matching the bundled-asset approach already used for the quiz heroes (constants/QuizQuestions.ts:72-83).


### 5. "Coming Soon" two-factor placeholder shipped in settings

`app/settings/privacy.tsx:330`  ·  _store-compliance_

**Defect.** The Privacy & Security screen renders a disabled Two-Factor Authentication card badged "Coming Soon" alongside a dead handler.

**How it fails.** privacy.tsx:330-339 renders the card with `<Text style={styles.comingSoonBadge}>Coming Soon</Text>`, and `handleSetup2FA` (:151-153) alerts "Coming Soon". app/settings/preferences.tsx:154 has another "Coming Soon" badge. Apple Guideline 2.1 explicitly calls out placeholder/"coming soon" content in submitted builds; this is usually a note rather than a hard rejection, but it compounds with the account-deletion stub which uses the same alert.

**Fix.** Remove the 2FA card and `handleSetup2FA` until implemented; same for the preferences.tsx:154 item.


---

## Journey map

## First-time-user journey map — verified against source

### 0. Cold start
- `app/_layout.tsx:29` `RootLayout` — `useFrameworkReady()`, loads 8 fonts, holds splash until `fontsLoaded || fontError` (`:45-49`, `:202-204`).
- `Analytics.trackAppOpen(false)` on mount + every foreground (`:52-60`).
- Deep-link handler (`:63-199`) runs **before** auth is known and can `router.replace` early: email-confirm → `/auth/login` (`:88`), recovery → `/auth/reset-password` (`:117`), `profile/`, `@handle`, `cheese/` → detail routes (`:140,155,172,182`).
- Renders `<AuthProvider>` → `<OnboardingRouterGuard/>` → `<Stack>` (`:207-224`). **There is no `app/index.tsx`** — the initial route is the `(tabs)` group, i.e. `app/(tabs)/index.tsx`. There is no auth wall anywhere.

### 1. Auth bootstrap — `contexts/AuthContext.tsx`
- `AuthProvider` (`:78`): `supabase.auth.getSession()` (`:132`) → `setUser` → `fetchProfile` → `setLoading(false)` (`:139`). `onAuthStateChange` (`:148`) repeats this on every event.
- `fetchProfile` (`:93-116`) selects `onboarding_quiz_completed_at`; uses `maybeSingle`, retries **once** after 800 ms if the row is missing. If both attempts miss, `profile` stays `null` forever (no further retry).
- `hasCompletedOnboarding` derived at `:322-327`: `null` if no user **or no profile**, `true` if `skipOnboardingSession` (in-memory only, `:83/126`), else `Boolean(profile.onboarding_quiz_completed_at)`.

### 2. Routing decision — `OnboardingRouterGuard`, `app/_layout.tsx:239-297`
Two effects.
- Effect A (`:246-282`) computes `isExistingUser`: `hasCompletedOnboarding===true` → `true`; else reads `profiles.created_at` and compares to `FRESH_SIGNUP_WINDOW_MS = 10 min` (`:237,272`). Missing row → `false` (treat as fresh OAuth). Query throw → `true` (bypass quiz).
- Effect B (`:284-294`) redirects to `/onboarding/quiz` **only when all five hold**: `!loading`, `user` truthy, `hasCompletedOnboarding === false`, `isExistingUser === false`, and pathname does not start with `/onboarding` or `/auth`.

Branch consequences (all verified):
- `hasCompletedOnboarding === null` (profile row never loaded) → guard silently never fires.
- Account older than 10 minutes → `isExistingUser===true` → quiz is never shown; user only gets `TuneYourFeedBanner`.

### 3a. Email signup path — `app/auth/signup.tsx`
`handleSignup` (`:23`) → `AuthContext.signUp` (`:202`, `supabase.auth.signUp`) → `Analytics.trackSignup` → confirmation UI (`:93-105`) and on native an `Alert` whose OK does `router.replace('/auth/login')` (`:46`). **Signup never lands in the app and never reaches the quiz** — the session doesn't exist until email confirmation.
Then `app/auth/login.tsx` `handleLogin:21` → `signIn` → `router.replace('/(tabs)/profile')` (`:33`). Pathname is now `/profile`, so the guard *can* fire — but only if the login happens within 10 minutes of `profiles.created_at`. A user who confirms their email later than that window never sees the quiz. This is the single largest hole in the funnel.

### 3b. OAuth path — `components/auth/OAuthButtons.tsx`
- Rendered on login (`login.tsx:136`), signup (`signup.tsx:180`), and `SignInPromptSheet` (`:93`).
- Apple button only when `Platform.OS==='ios' && appleSignInAvailable` (`OAuthButtons.tsx:76`, availability set in `AuthContext.tsx:86-91`). Google button always shown; logo is a **remote URI** (`OAuthButtons.tsx:28,100`).
- `handleGoogle/handleApple` (`:34,51`) → `AuthContext.signInWithGoogle:225` / `signInWithApple:260` → `supabase.auth.signInWithIdToken`. Cancellation returns silently (`:253,302`). Apple name backfill at `:282-299`.
- `onSuccess` routing is caller-decided: `login.tsx:138` and `signup.tsx:182` → `replace('/(tabs)/profile')`; `SignInPromptSheet:96-100` → dismiss + caller's `onAuthenticated`.
- Race: a brand-new OAuth user's `profiles` row is created by the `handle_new_user` trigger. If `fetchProfile`'s two attempts (`AuthContext.tsx:107-111`) both miss, `profile===null` → `hasCompletedOnboarding===null` → guard's `:287` early-return → **new OAuth user lands in the app with no quiz**. `_layout.tsx:267` anticipates the missing row for `isExistingUser` but that check is gated behind the `hasCompletedOnboarding===false` test that can never pass.

### 3c. Signed-out experience at each surface
- Home feed `app/(tabs)/index.tsx`: full feed renders; `SignedOutCTABanner placement="home_feed"` at `:1112` (signed-in users get `TuneYourFeedBanner` instead), plus `InlineSignUpCard` injected every 5th row (`:1123-1125`). Banner tap → `SignInPromptSheet` (`SignedOutCTABanner.tsx:36-39,60-68`), auth success → `replace('/(tabs)')`.
- Floating "+" `app/(tabs)/_layout.tsx:21-27`: no user → `SignInPromptSheet context="add_cheese"`; `onAuthenticated` (`:112-115`) dismisses then `router.push('/add-cheese')`. This push races the guard, which is simultaneously trying to `replace('/onboarding/quiz')` for the same brand-new user.
- Profile tab: signed-out branch at `app/(tabs)/profile.tsx:391`, CTAs to `/auth/signup` and `/auth/login` (`:422,425`). Cheese Box: signed-out branch at `app/(tabs)/cheese-box.tsx:279`.
- `SignInPromptSheet.tsx:34-42` holds 7 context-specific copy variants; email CTAs push `/auth/signup` / `/auth/login` (`:60,66`).

### 4. The quiz — `app/onboarding/quiz.tsx`
- `app/onboarding/_layout.tsx:10-21`: `headerShown:false`, **`gestureEnabled:false`** — no swipe-back out of quiz or result.
- 7 questions, `constants/QuizQuestions.ts:89-274`: `board_hero`(grid), `funky_or_fresh`(pair), `soft_or_hard`(pair), `milk_types`(multi,max3), `flavors`(chips,max3), `countries`(multi,max3), `adventurousness`(choice), `gouda_vs_manchego`(pair) — `QUIZ_QUESTION_COUNT` at `:274`.
- `QuizScreen:105`. `trackQuizStarted` once per mount (`:119-123`). Single-select types auto-advance via `setTimeout(goNext, 450)` (`:158-162`, timer not cleared on unmount); multi/chips need the Continue button, enabled only when `currentSelections.length > 0` (`:235-240`).
- `goNext:145` → at last index calls `finalize`.
- `finalize:179`: `!user` → `replace('/auth/login')` (`:182`); else `aggregateAnswers` (`:46`) → `saveTasteSeed(user.id, answers, false)` → `trackQuizCompleted` → `skipOnboardingForSession()` → `await refreshOnboardingStatus()` → `router.replace('/onboarding/result', {answers: JSON})` (`:188-200`). The `skipOnboardingForSession()` call at `:194` is the explicit anti-loop guard (comment `:190-193`).
- On save error (`:201-207`): Alert only, user stays on the last question; the only retry is re-tapping an option.
- `handleSkip:213`: saves partial with `skipped=true`, sets session flag, `replace('/(tabs)')`. `lib/taste-seed-service.ts:80` deliberately does **not** write `profiles.onboarding_quiz_completed_at` on skip — so the session flag is the only thing preventing a re-loop, and it is memory-only. Next cold start within the 10-min window re-shows the quiz.
- Persistence: `saveTasteSeed:50` upserts `user_taste_seed` (throws on error) then best-effort updates `profiles.onboarding_quiz_completed_at` (`:81-90`, failure is warn-only — the profile mirror can silently not happen while the user is treated as complete).
- Only exits from question 0: Skip. No back affordance (`QuizProgressBar.tsx:21`), no gesture, no hardware-back handling — and the guard arrived here via `replace`, so Android back has nothing to pop.

### 5. Result — `app/onboarding/result.tsx`
- `ResultScreen:100`. Parses `params.answers` JSON, degrading to `{}` on failure (`:31-39`) — a failed parse yields a generic tagline and a flat fingerprint rather than an error.
- Gate: `TasteRevealAnimation` renders until `onDone` (`:141-148`); the animation self-terminates after ~2.4 s (`TasteRevealAnimation.tsx:46-62`).
- `derivePersonalityTagline` (`lib/taste-personality.ts`), `buildMiniFingerprint` (`:91`) over `CURATED_FLAVOR_TAGS`.
- Two actions: **Share my taste** → `shareTasteResult:46`, dynamic-imports `lib/shareCard.generateAndShare('taste_result', …)` with a text `Share.share` fallback (`:56-83`); **See your feed** → `trackFirstFeedViewAfterQuiz` + `router.replace('/(tabs)')` (`:136-139`).
- No back/close control and `gestureEnabled:false` → "See your feed" is the only exit.

### 6. Landing in the app
`/(tabs)` → `app/(tabs)/index.tsx` (`HomeFeedScreen`, `:120` `useAuth`). Feed via `getPersonalizedFeed(user?.id, 20, [], 0, true)` (`:202`). Signed-in user now sees `TuneYourFeedBanner` (`:1112`), which self-hides when `hasCompletedOnboarding===true` (`components/TuneYourFeedBanner.tsx:34`), else checks a 7-day AsyncStorage dismissal (`:39-49`) and `cheese_box_entries` count `< 3` (`:53-61`); tap → `router.push('/onboarding/quiz')` (`:88`). Note this is the *second* entry point into the quiz and it uses `push`, not `replace`.

### 7. Logging a first cheese — `app/add-cheese.tsx`
- Entry: floating "+" (`(tabs)/_layout.tsx:23`) or feed prompt card (`(tabs)/index.tsx:1020`). The screen itself has **no signed-out guard** — it is a live route; auth is only checked inside handlers via `supabase.auth.getUser()` which throws `'Not authenticated'` and surfaces as `Alert('Error','Failed to add cheese…')` (`:143-144`, `:199-200`, `:302-303`, `:532`).
- `AddCheeseScreen:19`, `step` state machine: `search` → `handleSelectExisting:113` branches on `cheese.type === 'cheese_type'` (→ `add-new` with prefill) vs producer cheese (→ `showExistingDestinationModal`).
- Existing cheese: `handleExistingDestinationChoice:131` → `cheese_box` → step `add-existing` → `handleAddToBox:194` (image upload `:204-229`, insert into `cheese_box_entries` `:232-239`) → `checkAndShowMilestoneOrShare(user.id, () => router.replace('/(tabs)/cheese-box'), …)` (`:244`). Wishlist branch inserts into `wishlist` and Alerts with two navigation choices (`:170-181`).
- New cheese: `handleNewCheeseSubmit:265` → destination modal → `handleDestinationChoice:271` (cheese_box → rating modal → `handleRatingSubmit:287`) → `handleCreateNewCheese:294` (creates cheese type/producer cheese `:353,431`, badges RPC `:488`, then box or wishlist `:462-529`).
- Post-log gate `checkAndShowMilestoneOrShare:64`: milestone prompt wins if `checkMilestone(count)` and not previously shown (`:86-93`); otherwise share prompt only if `rating >= 4 || note.trim().length >= 20` (`shouldShowPostLogShare:57`), else immediate `navigateFn()`. Navigation is stored in state as `setPendingNavigation(() => navigateFn)` (`:90,107`) — if a prompt is shown and dismissed without firing `pendingNavigation`, the user stays on the add screen.

### Branch points that can dead-end or loop (summary for follow-on audits)
1. `_layout.tsx:287` — `hasCompletedOnboarding === null` (profile row never resolved by `AuthContext.tsx:107-111`) permanently disables the quiz for new OAuth users.
2. `_layout.tsx:272` + `signup.tsx:46` — 10-minute freshness window vs. an email-confirmation flow that can't complete inside it; email signups largely never see the quiz.
3. `_layout.tsx:276` — read failure defaults to bypass (`isExistingUser=true`), silently skipping onboarding.
4. `taste-seed-service.ts:80-90` — skip writes no durable flag, and the completion mirror is warn-only; the "completed" state can exist in `user_taste_seed` but not in `profiles`.
5. `(tabs)/_layout.tsx:112-115` vs `_layout.tsx:293` — `push('/add-cheese')` racing `replace('/onboarding/quiz')` right after in-sheet OAuth.
6. `onboarding/_layout.tsx:15` `gestureEnabled:false` with no hardware-back handling and no back control on `result.tsx` or quiz question 0.
7. `quiz.tsx:201-207` — save failure has no explicit retry affordance.
8. `add-cheese.tsx` — unguarded route; auth failure presents as a generic save error.
9. `OAuthButtons.tsx:28,100` — the Google logo is fetched from `developers.google.com` at render time on every auth surface.

---

## Refuted (investigated, not real)

- **Save failure on the last question strands the user with no retry affordance and no progress indicator** - Read app/onboarding/quiz.tsx (finalize at :179-211, needsContinue at :271, submitting at :300), constants/QuizQuestions.ts (Q8 `gouda_vs_manchego` is indeed type 'pair'), and lib/taste-seed-service.ts (saveTasteSeed rethrows on the seed upsert error).

The str
- **Quiz save failure emits no event — network losses look like abandonment** - REFUTED — the central premise ("in the data this is identical to abandonment at question 8") is false, and the "no retry affordance" claim is also false.

1. Failure IS distinguishable in analytics. `goNext` (app/onboarding/quiz.tsx:145-152) fires `Analytics.t
- **Users bypassed past the quiz produce no event, hiding a routing problem as an intent problem** - REFUTED. The literal code observation is correct — OnboardingRouterGuard (app/_layout.tsx:284-294) fires no analytics on any branch — but the claimed failure ("bypassed users are indistinguishable in data from users who chose not to start the quiz") does not h
- **SignInPromptSheet dismissals untracked and OAuth mode always mislabelled as signup** - Refuted. The raw code observations are literally true (no analytics call on backdrop/X dismiss; `mode="signup"` is hardcoded at SignInPromptSheet.tsx:94), but neither constitutes a defect, and the stated failure — "inflate apparent new-user acquisition" — rest
- **Cheese Box empty state makes "log in" the primary CTA for users who have no account** - Refuted — the load-bearing factual claim is wrong and the stated failure cannot occur.

What is true: `C:\Users\ross\Desktop\Projects\cheezusapp\cheezusapp\app\(tabs)\cheese-box.tsx:291-302` does route the primary "Start Your Journey" button to `/auth/login` a
- **High-traffic detail screens have no conversion CTA despite copy being written for them** - The mechanical half of the claim checks out - `SignedOutCTABanner` is imported and rendered exactly once (app/(tabs)/index.tsx:17 and :1112, placement="home_feed"), so the `profile`, `cheese_detail` and `producer_detail` entries of PLACEMENT_COPY are unused co
- **Profile fetch discards Supabase errors, permanently stranding hasCompletedOnboarding at null** - Read C:\Users\ross\Desktop\Projects\cheezusapp\cheezusapp\contexts\AuthContext.tsx (fetchProfile :93-116, hasCompletedOnboarding :322-327) and its consumers (app\_layout.tsx :242-294, components\TuneYourFeedBanner.tsx :24-74, app\(tabs)\profile.tsx :289, app\o
- **Missing Play Services surfaces as a raw SDK error alert** - The code description is accurate but the "defect" is a copy/UX preference, not a defect.

What the code actually does (C:\Users\ross\Desktop\Projects\cheezusapp\cheezusapp\contexts\AuthContext.tsx:237-257): the whole Google flow is wrapped in try/catch. The tw
- **Sign in with Apple can be absent on iOS while Google is offered (Guideline 4.8 risk)** - Refuted — the described failure cannot realistically occur.

1. Timing: `appleSignInAvailable` is resolved in `AuthProvider`, which is mounted at the app root (C:\Users\ross\Desktop\Projects\cheezusapp\cheezusapp\app\_layout.tsx:207), wrapping the entire Stack
- **Foreground session check does not refresh or clear an invalidated session** - The finding assumes getSession() is a pure cached read that silently returns null. It isn't. In node_modules/@supabase/gotrue-js/dist/main/GoTrueClient.js, __loadSession() checks `hasExpired` from expires_at and, when expired, awaits _callRefreshToken(refresh_
- **Public profile screen has no catch around fetchPublicProfile — a throw pins the spinner forever** - REFUTED — the loader genuinely has no try/catch, but none of the claimed rejection sources can actually reject, so the "spinner forever" failure cannot occur.

1. `tierFromCheeseCount` (C:\Users\ross\Desktop\Projects\cheezusapp\cheezusapp\constants\Tiers.ts:65
- **Taste reveal restarts on any auth-context re-render and has no fallback timer, stranding the user at the end of onboarding** - Refuted — the mechanism is partially real but the claimed failure ("stranded with no way out while it keeps restarting") cannot actually occur.

What is true: `onDone={() => setRevealed(true)}` (app/onboarding/result.tsx:145) is a fresh closure each render, it
- **Quiz save failure leaves the user on the last question with no retry path** - Read C:\Users\ross\Desktop\Projects\cheezusapp\cheezusapp\app\onboarding\quiz.tsx, lib\taste-seed-service.ts, components\onboarding\QuizProgressBar.tsx, components\onboarding\QuestionPair.tsx, and constants\QuizQuestions.ts.

The mechanics the finding describe
- **Face ID call with no NSFaceIDUsageDescription — iOS terminates the app** - REFUTED — the config plugin for expo-local-authentication is auto-applied by Expo prebuild whether or not it appears in `plugins`, so NSFaceIDUsageDescription IS present in the generated Info.plist.

Evidence:

1. `C:\Users\ross\Desktop\Projects\cheezusapp\che
- **Camera purpose string promises a label-scanning feature that does not exist** - REFUTED. The label-scanning feature is fully implemented; the finding appears to have searched only for barcode/OCR APIs (`CameraView`, `scanFromURLAsync`, `BarCodeScanner`) and concluded from their absence that no scanner exists. The app implements label scan
- **SYSTEM_ALERT_WINDOW shipped in the production Android manifest** - Verified the files directly. The one true part of the report is that `<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>` does sit at C:\Users\ross\Desktop\Projects\cheezusapp\cheezusapp\android\app\src\main\AndroidManifest.xml:8 and ther
- **Stack registers a +not-found route that does not exist** - The claimed failure cannot occur: expo-router auto-generates the `+not-found` route when no file defines it, so the Stack child exists and no warning is logged.

Evidence (expo-router 6.0.15, installed in this repo):
- node_modules/expo-router/build/getRoutesC
