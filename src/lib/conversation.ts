export function calculateVoiceLevel(samples: ArrayLike<number>) {
  if (!samples.length) return 0;
  let energy = 0;
  for (let index = 0; index < samples.length; index++) {
    const centred = (samples[index] - 128) / 128;
    energy += centred * centred;
  }
  return Math.sqrt(energy / samples.length);
}
