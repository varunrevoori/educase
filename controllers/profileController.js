const { query } = require('../config/db');
const { fetchGitHubProfile } = require('../utils/githubHelper');

/**
 * Trigger GitHub profile analysis and store/update in SQLite
 */
async function analyzeProfile(req, res) {
  const { username } = req.params;

  if (!username || username.trim() === '') {
    return res.status(400).json({ error: 'Username parameter is required' });
  }

  try {
    // Fetch and analyze data
    const profileData = await fetchGitHubProfile(username.trim());

    // Insert or update (Upsert) in SQLite
    const upsertSql = `
      INSERT INTO profiles (
        username, name, avatar_url, bio, location, blog, public_repos, 
        followers, following, total_stars, total_forks, primary_language, 
        most_starred_repo_name, most_starred_repo_stars
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET
        name = excluded.name,
        avatar_url = excluded.avatar_url,
        bio = excluded.bio,
        location = excluded.location,
        blog = excluded.blog,
        public_repos = excluded.public_repos,
        followers = excluded.followers,
        following = excluded.following,
        total_stars = excluded.total_stars,
        total_forks = excluded.total_forks,
        primary_language = excluded.primary_language,
        most_starred_repo_name = excluded.most_starred_repo_name,
        most_starred_repo_stars = excluded.most_starred_repo_stars,
        updated_at = CURRENT_TIMESTAMP;
    `;

    const values = [
      profileData.username,
      profileData.name,
      profileData.avatar_url,
      profileData.bio,
      profileData.location,
      profileData.blog,
      profileData.public_repos,
      profileData.followers,
      profileData.following,
      profileData.total_stars,
      profileData.total_forks,
      profileData.primary_language,
      profileData.most_starred_repo_name,
      profileData.most_starred_repo_stars
    ];

    await query(upsertSql, values);

    // Retrieve the freshly saved record to return
    const [rows] = await query('SELECT * FROM profiles WHERE username = ?', [profileData.username]);
    
    res.status(201).json({
      message: 'Profile analyzed and saved successfully',
      data: rows[0]
    });

  } catch (error) {
    console.error('Error analyzing profile:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Internal server error occurred' });
  }
}

/**
 * Get all analyzed profiles from SQLite database
 */
async function getAllProfiles(req, res) {
  try {
    // Sort and search parameters
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'created_at';
    const order = (req.query.order || 'DESC').toUpperCase();
    const limit = parseInt(req.query.limit || '50');
    const offset = parseInt(req.query.offset || '0');

    // Strict validation whitelist to prevent SQL injection
    const allowedSortFields = [
      'username', 'name', 'public_repos', 'followers', 'following', 
      'total_stars', 'total_forks', 'primary_language', 'most_starred_repo_stars',
      'created_at', 'updated_at'
    ];
    const allowedOrders = ['ASC', 'DESC'];

    if (!allowedSortFields.includes(sortBy)) {
      return res.status(400).json({ error: `Invalid sortBy field. Allowed: ${allowedSortFields.join(', ')}` });
    }

    if (!allowedOrders.includes(order)) {
      return res.status(400).json({ error: 'Invalid order parameter. Allowed: ASC, DESC' });
    }

    let selectSql = 'SELECT * FROM profiles';
    let countSql = 'SELECT COUNT(*) as total FROM profiles';
    const queryParams = [];
    const countParams = [];

    if (search.trim() !== '') {
      const searchWildcard = `%${search.trim()}%`;
      selectSql += ' WHERE username LIKE ? OR name LIKE ?';
      countSql += ' WHERE username LIKE ? OR name LIKE ?';
      queryParams.push(searchWildcard, searchWildcard);
      countParams.push(searchWildcard, searchWildcard);
    }

    // Append ordering (safe due to whitelist)
    selectSql += ` ORDER BY ${sortBy} ${order}`;
    
    // Append pagination
    selectSql += ' LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    // Run both queries
    const [profiles] = await query(selectSql, queryParams);
    const [countResult] = await query(countSql, countParams);
    const total = countResult[0].total;

    res.status(200).json({
      pagination: {
        total,
        limit,
        offset,
        count: profiles.length
      },
      data: profiles
    });

  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ error: 'Internal server error occurred' });
  }
}

/**
 * Get data of a single profile by username
 */
async function getProfileByUsername(req, res) {
  const { username } = req.params;

  if (!username || username.trim() === '') {
    return res.status(400).json({ error: 'Username parameter is required' });
  }

  try {
    const [rows] = await query('SELECT * FROM profiles WHERE username = ?', [username.trim()]);

    if (rows.length === 0) {
      return res.status(404).json({ 
        error: `Profile for user '${username}' not found in the database. Use POST /api/profiles/${username} to analyze it first.` 
      });
    }

    res.status(200).json({
      data: rows[0]
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error occurred' });
  }
}

/**
 * Delete a profile from the database
 */
async function deleteProfile(req, res) {
  const { username } = req.params;

  if (!username || username.trim() === '') {
    return res.status(400).json({ error: 'Username parameter is required' });
  }

  try {
    const [rows] = await query('SELECT id FROM profiles WHERE username = ?', [username.trim()]);

    if (rows.length === 0) {
      return res.status(404).json({ error: `Profile for user '${username}' not found in the database` });
    }

    await query('DELETE FROM profiles WHERE username = ?', [username.trim()]);

    res.status(200).json({
      message: `Profile analysis for '${username}' successfully deleted from database`
    });

  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({ error: 'Internal server error occurred' });
  }
}

module.exports = {
  analyzeProfile,
  getAllProfiles,
  getProfileByUsername,
  deleteProfile
};
