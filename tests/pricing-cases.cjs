exports.pricingCases = function pricingCases() {
  const jobs = [{
    jobType: 'trenching',
    subtype: 'Electrical Trench',
    metres: 20,
    depth: '600mm',
    width: 'narrow'
  }, {
    jobType: 'trenching',
    subtype: 'Plumbing Trench',
    metres: 9,
    depth: '300mm',
    width: 'standard'
  }, {
    jobType: 'trenching',
    subtype: 'Not Sure',
    metres: 102,
    depth: 'custom',
    width: 'custom'
  }, {
    jobType: 'service-exposure',
    subtype: 'Dig Around Known Services',
    exposureCount: 3,
    exposureDepth: 'shallow'
  }, {
    jobType: 'potholing',
    subtype: 'Gas Service',
    exposureCount: 10,
    exposureDepth: 'deep'
  }, {
    jobType: 'potholing',
    subtype: 'Not Sure',
    exposureCount: 'more-than-10',
    exposureDepth: 'unsure'
  }, {
    jobType: 'leak-exposure',
    subtype: 'Water Leak',
    leakArea: 'wide'
  }, {
    jobType: 'pit-cleanout',
    subtype: 'Valve Pit',
    pitSize: 'large',
    pitFill: 'heavy'
  }, {
    jobType: 'tunnel-bore',
    subtype: 'Under a Path',
    boreDist: 'short'
  }, {
    jobType: 'tunnel-bore',
    subtype: 'Under a Driveway',
    boreDist: 'long'
  }, {
    jobType: 'other',
    subtype: 'Something Unusual',
    otherDescription: 'Inspect a difficult site'
  }, {
    jobType: 'cattle-grid',
    subtype: 'Single Grid',
    cattleCount: '1-2',
    cattleFill: 'light'
  }];
  const cases = [];
  for (const job of jobs) for (const suburb of ['Canberra', 'Goulburn', 'Braidwood']) for (const access of ['open', 'side', 'difficult', 'unsure']) for (const ground of ['normal', 'hard', 'unsure']) for (const congestion of ['clear', 'congested', 'unsure']) for (const spoil of ['leave', 'remove-all', 'unsure']) for (const spoilVolume of ['small', 'full-load', 'more-than-1', 'unsure']) cases.push({
    ...job,
    suburb,
    access,
    ground,
    congestion,
    spoil,
    spoilVolume
  });
  return cases;
};
