const axios = require('axios');

/**
 * Fetches GitHub profile details and calculates analytical insights
 * @param {string} username - GitHub username to analyze
 * @returns {Promise<Object>} Analyzed profile data
 */
async function fetchGitHubProfile(username) {
  const token = process.env.GITHUB_TOKEN;
  const headers = {
    'User-Agent': 'github-profile-analyzer-api'
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  try {
    // 1. Fetch user general profile details
    const profileUrl = `https://api.github.com/users/${username}`;
    const profileResponse = await axios.get(profileUrl, { headers });
    const profileData = profileResponse.data;

    // 2. Fetch public repositories (with pagination, limit to 5 pages/500 repos)
    let repos = [];
    let page = 1;
    let keepFetching = true;

    while (keepFetching && page <= 5) {
      const reposUrl = `https://api.github.com/users/${username}/repos?per_page=100&page=${page}`;
      const reposResponse = await axios.get(reposUrl, { headers });
      const pageRepos = reposResponse.data;
      
      if (pageRepos.length === 0) {
        keepFetching = false;
      } else {
        repos = repos.concat(pageRepos);
        if (pageRepos.length < 100) {
          keepFetching = false;
        } else {
          page++;
        }
      }
    }

    // 3. Compute insights
    let totalStars = 0;
    let totalForks = 0;
    const languages = {};
    let mostStarredRepoName = null;
    let mostStarredRepoStars = -1;

    repos.forEach(repo => {
      totalStars += repo.stargazers_count || 0;
      totalForks += repo.forks_count || 0;

      // Track programming languages frequency
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + 1;
      }

      // Check for most starred repo
      if (repo.stargazers_count > mostStarredRepoStars) {
        mostStarredRepoStars = repo.stargazers_count;
        mostStarredRepoName = repo.name;
      }
    });

    // If no repos exist, handle default values
    if (mostStarredRepoStars === -1) {
      mostStarredRepoStars = 0;
      mostStarredRepoName = null;
    }

    // Find primary language
    let primaryLanguage = 'None';
    let maxLanguageCount = 0;
    for (const [lang, count] of Object.entries(languages)) {
      if (count > maxLanguageCount) {
        maxLanguageCount = count;
        primaryLanguage = lang;
      }
    }

    return {
      username: profileData.login,
      name: profileData.name || null,
      avatar_url: profileData.avatar_url || null,
      bio: profileData.bio || null,
      location: profileData.location || null,
      blog: profileData.blog || null,
      public_repos: profileData.public_repos || 0,
      followers: profileData.followers || 0,
      following: profileData.following || 0,
      total_stars: totalStars,
      total_forks: totalForks,
      primary_language: primaryLanguage,
      most_starred_repo_name: mostStarredRepoName,
      most_starred_repo_stars: mostStarredRepoStars
    };
  } catch (error) {
    if (error.response) {
      if (error.response.status === 404) {
        const notFoundError = new Error(`GitHub user '${username}' not found`);
        notFoundError.status = 404;
        throw notFoundError;
      }
      if (error.response.status === 403 && error.response.headers['x-ratelimit-remaining'] === '0') {
        const rateLimitError = new Error('GitHub API rate limit exceeded. Please try again later or configure GITHUB_TOKEN.');
        rateLimitError.status = 403;
        throw rateLimitError;
      }
    }
    throw error;
  }
}

module.exports = {
  fetchGitHubProfile
};
