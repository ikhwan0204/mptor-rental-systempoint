// Price is calculated from each motorcycle's own rate_per_hour, based on the
// actual start & end time the student picks. Floored to the nearest whole Ringgit.
//
// Example (motorcycle at RM5/hour):
//   2:00pm - 5:00pm   (3 hours)   -> RM15
//   5:00pm - 6:30pm   (1.5 hours) -> RM7   (7.5 floored)
//   8:00pm - 10:30pm  (2.5 hours) -> RM12  (12.5 floored)
function calculatePrice(ratePerHour, durationMinutes) {
  if (durationMinutes <= 0) return 0;
  const hours = durationMinutes / 60;
  return Math.floor(ratePerHour * hours);
}

const EXTEND_MINUTES = 30;

module.exports = { calculatePrice, EXTEND_MINUTES };
