import mongoose from 'mongoose';

const sitxHistorySchema = new mongoose.Schema({
    a: Boolean,
  b: Boolean,
  c: Boolean,
  w: Boolean,
  x: Boolean,
  d: Number,
  e: Number,
  f: Number,
  g: Number,
  h: Number,
  i: Number,
  j: Number,
  k: Number,
  l: Number,
  m: Number,
  n: Number,
  o: Number,
  p: Number,
  q: Number,
  r: Number,
  s: Number,
  t: Number,
  u: Number,
  v: Number,
  y: Number,
  z: Number,
  zz: Number,
  zzz: Number,
  timestamp: Number,
  receivedAt: Date
}, { collection: 'Sitxhistory' });

const SitxHistory = mongoose.model('Sitxhistory', sitxHistorySchema);
export default SitxHistory;






