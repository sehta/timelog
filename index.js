const express = require('express');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
// Schedule the cron job to run every day at 7:00 PM (19:00)
const job = cron.schedule('23 15 * * 1-5', () => {
    // This function will be executed when the cron job runs
    console.log('Cron job running at 3:00 PM');

    // add absent row who actully didn't mark attendance or not apply for leave
    addAbsentRow();


}, {
    scheduled: true,
    timezone: 'Asia/Kolkata' // Replace with your desired timezone
});





// Create the Express app
const app = express();
const bodyParser = require('body-parser');
// Middleware to parse request body as JSON
// app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Set the view engine to EJS
app.set('view engine', 'ejs');

// Endpoint to render the template
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/timeinfo', (req, res) => {
    res.render('timeinfo');
});

app.get('/applyleave', (req, res) => {
    const statusMessage = req.query.message;

    // Render the status page and pass the status message to the template
    res.render('applyleave', { statusMessage });
    // res.render('applyleave');
});

app.post('/apply-leave', (req, res) => {
    try {
        const {
            employeeId,
            leaveType,
            startDate,
            endDate,
            days,
            reason
        } = req.body;

        let start = new Date(startDate);
        let end = new Date(endDate);
        let now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const filename = `timelogs_${year}_${month}.json`;
        const filePath = path.join(__dirname, filename);
        let timeLogs = [];
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            timeLogs = JSON.parse(fileContent);
        } else {
            fs.writeFileSync(filePath, JSON.stringify(timeLogs));
        }

        const formattedStartDate = start.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
        });

        const formattedEndDate = end.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
        });


        const timeLog = {
            username: employeeId,
            wishType: "Morning",
            mins: 0,
            leaveType,
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            sTime: now,
            eTime: now,
            days,
            reason,
            status: 'Absent'
        };

        timeLogs.push(timeLog);

        // Save the time log entries to the JSON file
        fs.writeFileSync(filePath, JSON.stringify(timeLogs, null, 2));

        // res.sendStatus(200);
        res.redirect(`/applyleave?message=Leave has been applied successfully!`);
        // res.render('applyleave', { message: "Updated" });
    }
    catch (error) {
        console.error('Error capturing leave application:', error);
        res.sendStatus(500);
    }
});

app.post('/timelogdetail', (req, res) => {
    try {
        const { username, password } = req.body;
        // Verify employee details from the employees.json file
        const employeesFilePath = path.join(__dirname, 'employees.json');
        const employeesData = fs.readFileSync(employeesFilePath, 'utf8');
        const employees = JSON.parse(employeesData);
        const employee = employees.find(emp => emp.name === username && emp.password === password);
        if (!employee) {
            res.status(401).json({ error: 'Invalid employee credentials' });
            return;
        }
        let now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const filename = `timelogs_${year}_${month}.json`;
        const filePath = path.join(__dirname, filename);
        let timeLogs = [];
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            timeLogs = JSON.parse(fileContent);
        } else {
            fs.writeFileSync(filePath, JSON.stringify(timeLogs));
        }
        const empLogs = timeLogs.filter(emp => emp.username === username);
        res.json(empLogs);
    }
    catch (error) {
        console.error('Error capturing timelogdetail:', error);
        res.sendStatus(500);
    }
});

app.get('/logs', (req, res) => {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    // Render the EJS template with the required variables
    res.render('viewlogs', { currentYear, lastYear });
})

// API endpoint to get filtered time log records
app.get('/viewlogs', (req, res) => {
    const { username, month, year, isMobile, wishType, status } = req.query;
    if (!month)
        month = now.getMonth() + 1;
    if (!year)
        year = now.getFullYear();
    const filename = `timelogs_${year}_${month}.json`;
    const filePath = path.join(__dirname, filename);
    let timeLogs = [];
    if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        timeLogs = JSON.parse(fileContent);
    } else {
        fs.writeFileSync(filePath, JSON.stringify(timeLogs));
    }
    // Filter the time log records based on the provided filters
    let filteredLogs = timeLogs;
    console.log(filteredLogs);

    if (username) {
        filteredLogs = filteredLogs.filter(log => log.username.trim().toLowerCase() === username.trim().toLowerCase());
    }

    if (month) {
        filteredLogs = filteredLogs.filter(log => {
            const logMonth = new Date(log.sTime).getMonth() + 1;
            return logMonth === Number(month);
        });
    }

    if (year) {
        filteredLogs = filteredLogs.filter(log => {
            const logYear = new Date(log.sTime).getFullYear();
            return logYear === Number(year);
        });
    }

    if (isMobile) {
        filteredLogs = filteredLogs.filter(log => log.isMobile === (isMobile === true));
    }

    if (wishType) {
        filteredLogs = filteredLogs.filter(log => log.wishType === wishType);
    }
    if (status) {
        filteredLogs = filteredLogs.filter(log => log.status === status);
    }

    // Send the filtered time log records as the response
    res.json(filteredLogs);
});

// Endpoint to capture time log
app.post('/timelog', async (req, res) => {
    let errorLogs = [];
    try {
        const { username, password, userAgent, wishType } = req.body;

        // Verify employee details from the employees.json file
        const employeesFilePath = path.join(__dirname, 'employees.json');
        const employeesData = fs.readFileSync(employeesFilePath, 'utf8');
        const employees = JSON.parse(employeesData);



        // Get the current date in yyyy-mm-dd format
        let now = new Date();
        // Adjust the date to Kolkata time
        now.setUTCHours(now.getUTCHours() + 5); // Add 5 hours
        now.setUTCMinutes(now.getUTCMinutes() + 30); // Add 30 minutes
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const errorFileName = `error_${year}_${month}.json`;
        const errorFilePath = path.join(__dirname, errorFileName);

        if (fs.existsSync(errorFilePath)) {
            const fileContent = fs.readFileSync(errorFilePath, 'utf8');
            errorLogs = JSON.parse(fileContent);
        } else {
            fs.writeFileSync(errorFilePath, JSON.stringify(errorLogs));
        }

        const employee = employees.find(emp => emp.name === username && emp.password === password);
        if (!employee) {
            errorLogs.push({ isMobile: userAgent ? userAgent.includes('Mobile') : false, name: username, password: password, userAgent: userAgent, wishType: wishType, time: now, error: 'Invalid employee credentials' });
            res.status(401).send('Invalid employee credentials');
            return;
        }


        // Create a new time log entry
        const timeLog = {
            username,
            userAgent,
            isMobile: userAgent ? userAgent.includes('Mobile') : false,
            startDate: null,
            startTime: null,
            endDate: null,
            endTime: null,
            wishType,
            sTime: null,
            eTime: null,
            mins: 0
        };


        // Load existing time log entries or create a new file if it doesn't exist

        const filename = `timelogs_${year}_${month}.json`;
        const filePath = path.join(__dirname, filename);

        let timeLogs = [];
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            timeLogs = JSON.parse(fileContent);
        } else {
            fs.writeFileSync(filePath, JSON.stringify(timeLogs));
        }



        // Format the adjusted date in dd-mm-yy HH:mm format
        const formattedDate = now.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
        });

        const formattedTime = now.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
        });


        // Check if already an entry for start today for same user
        const startDateExist = timeLogs.find(emp => emp.wishType == 'Morning' && emp.username === username && emp.startDate == formattedDate);
        if (wishType == 'Morning' && startDateExist) {
            errorLogs.push({ isMobile: userAgent ? userAgent.includes('Mobile') : false, name: username, password: password, userAgent: userAgent, wishType: wishType, time: now, error: 'Invalid employee credentials' });
            res.status(403).send('Error: You are already Clocked In for the day!');
            return;
        }


        // Check if already an entry for end today for same user
        const endDateExist = timeLogs.find(emp => emp.wishType == 'Evening' && emp.username === username && emp.endDate == formattedDate);
        if (wishType == 'Evening' && endDateExist) {
            errorLogs.push({ isMobile: userAgent ? userAgent.includes('Mobile') : false, name: username, password: password, userAgent: userAgent, wishType: wishType, time: now, error: 'Invalid employee credentials' });
            res.status(403).send('Error: You are already Clocked Out for the day!');
            return;
        }
        // If user tries to Good Evening with Good Morning
        if (wishType == 'Evening' && !startDateExist) {
            errorLogs.push({ isMobile: userAgent ? userAgent.includes('Mobile') : false, name: username, password: password, userAgent: userAgent, wishType: wishType, time: now, error: 'Invalid employee credentials' });
            res.status(403).send('Error: Firstly, You need to ClockIn!');
            return;
        }

        // Concatenate the formatted date and time
        // const formattedDateTime = `${formattedDate} ${formattedTime}`;

        if (wishType == 'Evening') {
            // If an entry already exists for the current date, set the end date
            startDateExist.endDate = formattedDate;
            startDateExist.endTime = formattedTime;
            startDateExist.eTime = now;
            const date1 = new Date(startDateExist.sTime);
            const date2 = new Date(now);

            // Calculate the time difference in milliseconds
            const timeDiff = date2 - date1;

            // Convert milliseconds to minutes
            const minutesDiff = Math.floor(timeDiff / 60000);
            startDateExist.mins = minutesDiff;
            startDateExist.wishType = 'Evening';
            startDateExist.status = "Present";


        } else {
            // If no entry exists for the current date, create a new entry with the start date
            timeLog.startDate = formattedDate;
            timeLog.startTime = formattedTime;
            timeLog.sTime = now;
            timeLog.status = "Present - PunchOut Missed";
            timeLogs.push(timeLog);
        }



        // Save the time log entries to the JSON file
        fs.writeFileSync(filePath, JSON.stringify(timeLogs, null, 2));

        res.sendStatus(200);
    } catch (error) {
        console.error('Error capturing time log:', error);
        errorLogs.push({ isMobile: userAgent ? userAgent.includes('Mobile') : false, name: username, password: password, userAgent: userAgent, wishType: wishType, time: now, error: error });
        res.sendStatus(500);
    }
});


app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = `./${filename}.json`;

    res.sendFile(filePath, { root: __dirname }, (err) => {
        if (err) {
            // Handle error if file sending fails
            console.error(err);
            res.status(404).send('File not found');
        }
    });
});


const addAbsentRow = () => {
    const employeesFilePath = path.join(__dirname, 'employees.json');
    const employeesData = fs.readFileSync(employeesFilePath, 'utf8');
    const employees = JSON.parse(employeesData);

    const now = new Date();
    // Adjust the date to Kolkata time
    now.setUTCHours(now.getUTCHours() + 5); // Add 5 hours
    now.setUTCMinutes(now.getUTCMinutes() + 30); // Add 30 minutes

    // Format the adjusted date in dd-mm-yy HH:mm format
    const formattedDate = now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
    });

    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const filename = `timelogs_${year}_${month}.json`;
    const filePath = path.join(__dirname, filename);

    let timeLogs = [];
    if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        timeLogs = JSON.parse(fileContent);
    } else {
        fs.writeFileSync(filePath, JSON.stringify(timeLogs));
    }


    for (let i = 0; i < employees.length; i++) {
        const ifTodayDataExist = timeLogs.find(tl => tl.username == employees[i].name && tl.startDate === formattedDate);
        if (!ifTodayDataExist) {
            const timeLog = {
                username: employees[i].name,
                wishType: "Morning",
                mins: 0,
                leaveType: 'Casual',
                startDate: formattedDate,
                endDate: formattedDate,
                sTime: now,
                eTime: now,
                days: 1,
                reason: "Automatic added",
                status: 'Absent'
            };

            timeLogs.push(timeLog);
        }
    }
    // Save the time log entries to the JSON file
    fs.writeFileSync(filePath, JSON.stringify(timeLogs, null, 2));
}

// Start the server
var port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log('Server listening on port ' + port);
});

// Start the cron job
job.start();
