# #BACK
![](https://karippal.in/wp-content/uploads/2022/06/Screenshot-2022-06-16-at-2.52.17-PM.png)
A ***no-code*** microservice that can ***automatically build APIs*** from your database, ***protect your APIs with JWT***, and construct Rest APIs ***without writing any code*** for the backend.

The idea is to make development more pleasurable and productive. Being a full-stack developer entails being an all-rounder. This tool ***transforms a developer who is unfamiliar with backend technologies into a full-stack developer***.

##### Supported Microservice Platforms:
- [x] NodeJS
- [ ]  PYTHON
- [ ] Java
- [ ] .Net 

##### Supported Database Platforms:
- [x] MySQL/MariaDB 
- [ ] Microsoft SQL Server
- [ ] PostgreSQL
- [ ] Oracle Database

New database platforms are coming shortly! ***We are in testing***.

To know more about us, visit [**#WEAREKINS**](https://karippal.in/).

------

## Installation
Please follow the steps to install the #Back desktop application.
* Download the latest version of #Back [here](https://github.com/WeAreKins/BackNode/releases/latest)
* Install the application and create an account.
* Click **Create application** and enter your Database server Details
* On the open application, you can see all APIs

------

## Usage
##### *DATA APIs*
The service has two types of APIs, **GET** to retrieve data and **POST** to insert or update data. Please use `Content-Type: application/json` in the request header.
**Generated automatically** from a database table called DATA APIs

***To access DATA APIs***, use: `server_url/data/table_name`

***Example***: `http://localhost:2225/data/users` in this case, Table name users.
| Methods | Parameter | Data Type | Remarks                                                                     |
|---------|-----------|-----------|-----------------------------------------------------------------------------|
|      | limit     | Numeric   | Retrive data limit                                                          |
| GET        | offset    | Numeric   | Retrive data offset                                                         |
|         | where     | String    | pass entire SQL where contion to query parameter like `id>5 AND active = 1` |
| POST    | set       | Object    | JSON object of column name and data. example:                               |
|         | where     | String    | Pass entire SQL where condition to body like `id=15`                        |

In the API method, POST has a where parameter it uses as an update.
##### *Custom APIs*
For custom APIs SQL is used, for example:

`SELECT * FROM users WHERE id={{user_id}}`

`{{user_id}}`is a dynamic parameter that can pass through a query parameter in the GET method or with a request body in the POST method.

Optional Parameters with default value:

`SELECT * FROM users WHERE id={{user_id?'sree'}}`

In case _user_id_ is not defined it automatically take dafault value _'sree'_. You can also use like `{{user_id?}}` so default value will be _null_ incase _user_id_ is not set.


## Download the NodeJS microservice
Go-to Download menu in the application, double-check the configuration, and save the back-node microservice zip file to your local system.

**Please Note**: In case your ***database and application source are on the same server***, please remove the Over SSH option in configuration **Deploy server**

## Microservice Installation
Upload the **#back-node** source to your server and set up your virtual host pointing to the node-back source.

---

## User and Permission Management

The **#Back** application is built with **user and permission management** and employs **JWT** security to safeguard APIs against malicious activity.

## License
[MIT](https://choosealicense.com/licenses/mit/) License

Copyright (c) [2022] [Karippal Innovations](https://karippal.in/)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

***The software is provided "as is", without warranty of any kind, express or
implied, including but not limited to the warranties of merchantability,
fitness for a particular purpose and noninfringement. in no event shall the
authors or copyright holders be liable for any claim, damages or other
liability, whether in an action of contract, tort or otherwise, arising from,
out of or in connection with the software or the use or other dealings in the
software.***

