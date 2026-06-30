async function test() {
  const res = await fetch("https://api.crispydosa.info/mobile/stripe/restaurant-key?restaurant_id=23");
  const data = await res.json();
  console.log("Stripe:", JSON.stringify(data));
  
  const res2 = await fetch("https://api.crispydosa.info/mobile/restaurant/23");
  const data2 = await res2.json();
  console.log("Restaurant:", JSON.stringify(data2));
}
test();
