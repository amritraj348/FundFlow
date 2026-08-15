const Donation = require('../models/Donation');
const Campaign = require('../models/Campaign');
const NGO = require('../models/NGO');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { resolveDateRange } = require('../utils/analyticsRange');

const TOP_N = 5;

function emptySummary() {
  return { totalRaised: 0, totalDonations: 0, totalDonors: 0 };
}

// A donor is counted as one distinct supporter whether they're a registered
// user (grouped by donor id) or a guest (grouped by their email) — this is
// the piece that makes "totalDonors" mean unique supporters rather than
// raw donation count.
function summaryStages(extraMatch) {
  const stages = [];
  if (extraMatch) stages.push({ $match: extraMatch });
  stages.push(
    {
      $group: {
        _id: null,
        totalRaised: { $sum: '$amount' },
        totalDonations: { $sum: 1 },
        donorKeys: { $addToSet: { $ifNull: ['$donor', '$guestInfo.email'] } },
      },
    },
    { $project: { _id: 0, totalRaised: 1, totalDonations: 1, totalDonors: { $size: '$donorKeys' } } }
  );
  return stages;
}

function trendStages(dateMatch, granularity) {
  return [
    { $match: dateMatch },
    {
      $group: {
        _id: { $dateTrunc: { date: '$createdAt', unit: granularity } },
        amount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', amount: 1, count: 1 } },
  ];
}

// NGO admin analytics are always derived from req.user — there is no :id
// param to pass, so there is no cross-NGO ID to guess or leak through. This
// is the endpoint's entire scoping mechanism, not just a check on top of it.
const getNgoAnalytics = asyncHandler(async (req, res) => {
  const ngo = await NGO.findOne({ admin: req.user._id });
  if (!ngo) {
    const error = new Error('You do not have an NGO profile yet');
    error.statusCode = 400;
    throw error;
  }

  const { from, to, granularity } = resolveDateRange(req.query);
  const dateMatch = { createdAt: { $gte: from, $lte: to } };

  const [result] = await Donation.aggregate([
    { $match: { ngo: ngo._id, status: 'success' } },
    {
      $facet: {
        allTime: summaryStages(),
        rangeSummary: summaryStages(dateMatch),
        trend: trendStages(dateMatch, granularity),
        topCampaigns: [
          { $match: dateMatch },
          { $group: { _id: '$campaign', amount: { $sum: '$amount' }, donations: { $sum: 1 } } },
          { $sort: { amount: -1 } },
          { $limit: TOP_N },
          { $lookup: { from: 'campaigns', localField: '_id', foreignField: '_id', as: 'campaign' } },
          { $unwind: '$campaign' },
          { $project: { _id: 0, campaignId: '$campaign._id', title: '$campaign.title', amount: 1, donations: 1 } },
        ],
      },
    },
  ]);

  res.status(200).json({
    success: true,
    range: { from, to, granularity },
    allTime: result.allTime[0] || emptySummary(),
    summary: result.rangeSummary[0] || emptySummary(),
    trend: result.trend,
    topCampaigns: result.topCampaigns,
  });
});

const getPlatformAnalytics = asyncHandler(async (req, res) => {
  const { from, to, granularity } = resolveDateRange(req.query);
  const dateMatch = { createdAt: { $gte: from, $lte: to } };

  const [[donationStats], totalActiveCampaigns, userRoleCounts, ngoStatusCounts] = await Promise.all([
    Donation.aggregate([
      { $match: { status: 'success' } },
      {
        $facet: {
          allTime: summaryStages(),
          rangeSummary: summaryStages(dateMatch),
          trend: trendStages(dateMatch, granularity),
          topNgos: [
            { $match: dateMatch },
            { $group: { _id: '$ngo', amount: { $sum: '$amount' }, donations: { $sum: 1 } } },
            { $sort: { amount: -1 } },
            { $limit: TOP_N },
            { $lookup: { from: 'ngos', localField: '_id', foreignField: '_id', as: 'ngo' } },
            { $unwind: '$ngo' },
            { $project: { _id: 0, ngoId: '$ngo._id', name: '$ngo.name', amount: 1, donations: 1 } },
          ],
        },
      },
    ]),
    Campaign.countDocuments({ status: 'active' }),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    NGO.aggregate([{ $group: { _id: '$approvalStatus', count: { $sum: 1 } } }]),
  ]);

  const usersByRole = Object.fromEntries(userRoleCounts.map((r) => [r._id, r.count]));
  const ngosByStatus = Object.fromEntries(ngoStatusCounts.map((r) => [r._id, r.count]));

  res.status(200).json({
    success: true,
    range: { from, to, granularity },
    allTime: donationStats.allTime[0] || emptySummary(),
    summary: donationStats.rangeSummary[0] || emptySummary(),
    trend: donationStats.trend,
    topNgos: donationStats.topNgos,
    platform: {
      totalActiveCampaigns,
      totalUsers: userRoleCounts.reduce((sum, r) => sum + r.count, 0),
      usersByRole,
      totalNgos: ngoStatusCounts.reduce((sum, r) => sum + r.count, 0),
      ngosByStatus,
    },
  });
});

module.exports = { getNgoAnalytics, getPlatformAnalytics };
