# grunt-ftp-upload

这是一个 [grunt](https://github.com/gruntjs/grunt) 任务插件，用于将文件上传FTP.

这是由 grunt-ftp-deploy 修改后的一个版本，使用方法和参数 grunt-ftp-deploy 一致, 增加了一个功能点，即允许执行单个文件上传

下面的使用说明，基本和 grunt-ftp-deploy 一样，除了src参数.

## Getting Started
This plugin requires Grunt `~0.4.1`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-ftp-upload --save-dev
```

## Usage

To use this task you will need to include the following configuration in your _grunt_ file:

```javascript
'ftp_upload': {
  build: {
    auth: {
      host: 'server.com',
      port: 21,
      authKey: 'key1'
    },
    src: 'path/to/source/folder',
    dest: '/path/to/destination/folder',
    exclusions: ['path/to/source/folder/**/.DS_Store', 'path/to/source/folder/**/Thumbs.db', 'dist/tmp']
  }
}
```

and load the task:

```javascript
grunt.loadNpmTasks('grunt-ftp-upload');
```

Another example for single file upload

```javascript
'ftp_upload': {
  build: {
    auth: {
      host: 'server.com',
      port: 21,
      authKey: 'key1'
    },
    src: ['path/to/source/folder/target.js','path/to/source/folder/hi.js'],
    dest: '/path/to/destination/folder',
    exclusions: ['path/to/source/folder/**/.DS_Store', 'path/to/source/folder/**/Thumbs.db', 'dist/tmp']
  }
}
```

The parameters in our configuration are:

- **host** - the name or the IP address of the server we are deploying to
- **port** - the port that the _ftp_ service is running on
- **authKey** - a key for looking up saved credentials in `.ftppass` (see next section). If no value is defined, the `host` parameter will be used
- **src** - the source location, the local folder that we are transferring to the server, i will get the first value if this is array; if the first value is a dir, then it will work as the same as `grunt-ftp-deploy`, if this first value is a file, it will use single file upload model
- **dest** - the destination location, the folder on the server we are deploying to
- **exclusions** - an optional parameter allowing us to exclude files and folders by utilizing grunt's support for [minimatch](https://github.com/isaacs/minimatch). The `matchBase` minimatch option is enabled, so `.git*` would match the path `/foo/bar/.gitignore`.


## Authentication parameters

Usernames and passwords can be stored in an optional JSON file named `.ftppass`. This file should be located in the same folder as your `Gruntfile`. `.ftppass` should have the following format:

```javascript
{
  "key1": {
    "username": "username1",
    "password": "password1"
  },
  "key2": {
    "username": "username2",
    "password": "password2"
  }
}
```

This way we can save as many username / password combinations as we want and look them up by the `authKey` value defined in the _grunt_ config file where the rest of the target parameters are defined.

The task prompts for credentials that are not found in `.ftppass` and it prompts for all credentials if `.ftppass` does not exist.

**IMPORTANT**: make sure that the `.ftppass` file uses double quotes (which is the proper _JSON_ syntax) instead of single quotes for the names of the keys and the string values.

## Dependencies

This task is built by taking advantage of the great work of Sergi Mansilla and his [jsftp](https://github.com/sergi/jsftp) _node.js_ module and suited for the **0.4.x** branch of _grunt_.


