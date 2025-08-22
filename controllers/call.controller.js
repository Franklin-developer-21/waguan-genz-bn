export const initiateCall = (req, res) => {
  const { targetUserId, callType } = req.body;
  res.json({ 
    message: 'Call initiated', 
    callerId: req.userId, 
    targetUserId, 
    callType 
  });
};