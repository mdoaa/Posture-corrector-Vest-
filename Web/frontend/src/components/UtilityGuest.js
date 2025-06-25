const setGuestId = (guestId) => {
  const oneDayInSeconds = 60 * 60 * 24 ;
  document.cookie = `guestId=${guestId};path=/;max-age=${oneDayInSeconds};SameSite=Lax`;
};

const getGuestId = () => {
  const cookie = document.cookie
    .split(";")
    .map(c => c.trim())
    .find(c => c.startsWith("guestId="));
  return cookie ? cookie.split("=")[1] : null;
};

export const getOrCreateGuestId = () => {
  let guestId = getGuestId();
  if (!guestId) {
    console.log("guestId not found, creating a new one");
    const randomStr = Math.random().toString(36).substring(2);
    const dateStr = Date.now().toString(36);
    guestId = `${randomStr}${dateStr}`;
    setGuestId(guestId);
  }
  console.log("guestId from utility guest: " + guestId);
  return guestId;
};
