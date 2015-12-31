# Photo on Startup

I wanted to have my computer take a picture of me the first time I opened it each day and make those photos accessible from a small site online and update my Twitter profile image. This script does all of that stuff. 

Installation is somewhat involved, and it’s likely overkill for your needs. If you're looking to do something similar perhaps you’ll find something useful in here.

## Installation

Run `npm install` on the `photo-on-startup` directory. Install imagesnap `brew install imagesnap`. Install and configure sleepwatcher `brew install sleepwatcher`.

Create a script in your user bin (photo.sh, for example) which executes the the photo-on-startup script snap command. Be sure to change your directories as appropriate. For example:

```
#!/usr/bin/env sh
/usr/local/bin/node /Users/jk/Projects/photo-on-startup/index.js snap
```

*Note: When executing a node script from a bash script with launchd you need to supply the full path to node, you can't simply call `node`.*

Create and load a .plist file for launchd to run at load. This will have `sleepwatcher` monitor your machine for wake up and run `photo-on-startup` if it hasn't yet been run today. Save it as `com.photoonstart.sleepwatcher.plist`.

```
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.photoonstart.sleepwatcher</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/sbin/sleepwatcher</string>
    <string>-V</string>
    <string>-w ~/bin/photo.sh</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
```

## Compiling and Uploading

`photo-on-startup` uses [Harp](http://harpjs.com) to build a static site which displays the photos. When a new photo is taken, the site is automatically re-built and uploaded to S3. To configure S3, ensure the user has permission to modify bucket files. You can do this by logging into AWS, then navigating to Security Credentials > Users > [User] > Edit Policy.

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "s3:DeleteObject",
                "s3:PutObject",
                "s3:ListBucket"
            ],
            "Sid": "AllowNewUserAccessToMyBucket",
            "Resource": [
                "arn:aws:s3:::AWSBUCKETNAME",
                "arn:aws:s3:::AWSBUCKETNAME/*"
            ],
            "Effect": "Allow"
        }
    ]
}
```

Lastly, create a file called `credentials.json` in the root of the `photo-on-startup` directory. Fill in your credentials as appropriate:

```
{ 
  "aws": {
    "accessKeyId": "ASDF123", 
    "secretAccessKey": "ASDF123", 
    "region": "us-east-1"
  },
  "twitter": {
    "consumer_key": "ASDF123",
    "consumer_secret": "ASDF123",
    "access_token_key": "ASDF123",
    "access_token_secret": "ASDF123"
  }
}
```

**Make sure you add this to a .gitignore file if publishing in a repo!**

If you're running into trouble make sure to CHMOD the index.js file within `photo-on-starup` to `777`.

## Methods

You can run this from command line by changing your directory to the root of `photo-on-startup`, then running:

```
node . snap
```
```
node . deploy
```

snap will run the entire process of taking a photo, updating the data, building Harp and deploying to S3. Deploy simply builds harp and deploys to S3.

## Further Resources

- [More about Launchd scripts](http://www.splinter.com.au/using-launchd-to-run-a-script-every-5-mins-on/)