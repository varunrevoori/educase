const express = require('express');
const router = express.Router();
const { 
  analyzeProfile, 
  getAllProfiles, 
  getProfileByUsername, 
  deleteProfile 
} = require('../controllers/profileController');

// Route to analyze a new profile or refresh an existing analysis
router.post('/:username', analyzeProfile);

// Route to list all analyzed profiles
router.get('/', getAllProfiles);

// Route to fetch a single profile from the database
router.get('/:username', getProfileByUsername);

// Route to delete a profile analysis from the database
router.delete('/:username', deleteProfile);

module.exports = router;
