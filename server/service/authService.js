var User = require('./../model/user');
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
var errorMsg = require('./../util/errorMessages.json');
var constant = require('./../config/constant');
var walletService = require('./walletBtcService');
const saltRounds = 10;

// shared contains public functions
var shared = {};
// __private contains private functions
var __private = {};

/**
 * @description User to validate user object and password
 * @param {*} user 
 * @param {*} cb 
 * @returns error message or false if not
 */
__private.validate = function(user, cb){
    if(!user){
        cb(errorMsg.user.required.message);
    }else if(!user.name || user.name.length == 0){
        cb(errorMsg.user.required.name);
    }else if(!user.email || user.email.length == 0){
        cb(errorMsg.user.required.email);
    }else if(!user.password || user.password.length == 0){
        cb(errorMsg.user.required.password);
    } else {
        bcrypt.hash(user.password, saltRounds, cb);
    }
}

/**
 * @description Validate password and user from DB
 * @param {*} user 
 * @param {*} cb 
 * @returns error and user object
 */
__private.validatePassword = function(user, cb){
    if(!user || user == null){
        cb(errorMsg.user.required.message);
    }else if(!user.email || user.email.length == 0){
        cb(errorMsg.user.required.email);
    }else if(!user.password || user.password.length == 0){
        cb(errorMsg.user.required.password);
    } else {
        User.findOne({
            email: user.email
        }, function(err, result){
            if(err || !result){
                cb(err || errorMsg.user.invalidPassword);
            } else {
                bcrypt.compare(user.password, result.password, function(err, res) {
                    if(err || res == false){
                        cb(err || errorMsg.user.invalidPassword);
                    } else{
                        delete result['password'];
                        cb(null, result);
                    }
                })
            }
        });
    }
}

/**
 * @description use to register a user
 * @param {*} user 
 * @param {*} cb 
 * @returns error and result
 */
shared.register = function (user, cb){
    __private.validate(user, function (error, hash){
        if(error){
            cb(error);
        } else {
            user.password = hash;
            let userObj = new User(user);
            let err = userObj.validateSync();
            if(err){
                cb(err);
            } else {
                userObj.save(function(err, response){
                    if(!err){
                        walletService.wallet.generate(response._id, cb);
                    } else{
                        cb(err);
                    }
                });
            }
        }
    });
}

/**
 * @description use to login a user
 * @param {*} user 
 * @param {*} cb 
 * @returns error and user object with access token
 */
shared.login = function (user, cb){
    __private.validatePassword(user, function(error, result){
        if(error){
            cb(error);
        } else {
            let userObj = JSON.parse(JSON.stringify(result));
            delete userObj['password'];
            let token = jwt.sign({ id: userObj._id}, constant.JWT_SECRET, {
                expiresIn: 86400 // expires in 24 hours
            });
            cb(null, {token: token, user: userObj});
        }
    });
}

module.exports = shared;