/**
 * 저장한 서비스 목록에서 저장을 해제할 때의 확인 여부. 목록에서 바로 사라지므로 묻고,
 * "다시 묻지 않기"를 고르면 이 브라우저에서는 더 묻지 않는다.
 * 홈·목록·상세에서 저장을 끄는 것은 화면에서 사라지지 않으므로 묻지 않는다.
 */
const KEY = "webter:skip-unsave-confirm";

export function skipUnsaveConfirm(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberSkipUnsaveConfirm() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // 저장하지 못하면 다음에 다시 묻는다
  }
}
