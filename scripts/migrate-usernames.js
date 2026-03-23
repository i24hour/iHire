import connectDB from './src/lib/mongodb.js';
import User from './src/models/User.js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from frontend directory
dotenv.config({ path: path.join(process.cwd(), 'frontend', '.env.local') });
dotenv.config({ path: path.join(process.cwd(), 'frontend', '.env') });

async function migrate() {
    try {
        await connectDB();
        console.log('Connected to DB');
        
        const users = await User.find({ username: { $exists: true, $ne: null } });
        console.log(`Found ${users.length} users with usernames`);
        
        let updatedCount = 0;
        for (const user of users) {
            if (user.username && user.username !== user.username.toLowerCase()) {
                const oldUsername = user.username;
                user.username = user.username.toLowerCase();
                // We use save() to trigger the lowercase: true if it was missing before, 
                // but since we updated the model, it should be fine.
                // However, there might be collision if two users had same name in different case.
                // But the requirement says they should be same, so if they exist, it's already a problem.
                try {
                    await user.save();
                    console.log(`Updated ${oldUsername} -> ${user.username}`);
                    updatedCount++;
                } catch (err) {
                    console.error(`Failed to update ${oldUsername}: ${err.message}`);
                }
            }
        }
        
        console.log(`Migration finished. Updated ${updatedCount} users.`);
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
