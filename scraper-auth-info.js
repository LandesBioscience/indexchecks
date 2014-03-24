var sources = {};

// Info for logging in to landes.
var landes = {};
landes.url = 'http://www.landesbioscience.com/admin/';
landes.form = {
  admin_username : process.env.AU_USR_0,
  admin_password : process.env.AU_PWD_0
};

exports.landes = landes;
