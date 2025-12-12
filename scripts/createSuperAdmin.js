// scripts/createSuperAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const SuperAdmin = require('../models/SuperAdmin');

const connectDB = require('../config/database');

const createSuperAdmin = async () => {
  try {
    await connectDB();
    
    console.log('Creating Super Admin...');
    
    // Check if Super Admin already exists
    const existingAdmin = await User.findOne({ 
      email: process.env.SUPER_ADMIN_EMAIL 
    });
    
    if (existingAdmin) {
      console.log('Super Admin already exists:', existingAdmin.email);
      
      // Ensure role is super_admin
      if (existingAdmin.role !== 'super_admin') {
        existingAdmin.role = 'super_admin';
        await existingAdmin.save();
        console.log('Updated role to super_admin');
      }
      
      // Check if SuperAdmin record exists
      let superAdminRecord = await SuperAdmin.findOne({ user: existingAdmin._id });
      if (!superAdminRecord) {
        superAdminRecord = await SuperAdmin.create({
          user: existingAdmin._id,
          permissions: {
            manageUsers: true,
            manageRoles: true,
            manageDistricts: true,
            manageClubs: true,
            manageMarketplace: true,
            manageLeaderboard: true,
            manageSettings: true,
            viewAnalytics: true,
            systemAccess: true
          }
        });
        console.log('Created SuperAdmin record');
      }
      
      console.log('Super Admin setup complete!');
      process.exit(0);
      return;
    }
    
    // Create new Super Admin user
    const superAdminUser = new User({
      googleId: `superadmin-${Date.now()}`,
      email: process.env.SUPER_ADMIN_EMAIL,
      fullName: 'Super Admin',
      displayName: 'Super Admin',
      role: 'super_admin',
      club: 'System',
      district: 'System',
      isVerified: true,
      isActive: true,
      leoId: 'SA001',
      serviceHours: 0
    });
    
    await superAdminUser.save();
    console.log('Created Super Admin user:', superAdminUser.email);
    
    // Create SuperAdmin record
    const superAdminRecord = new SuperAdmin({
      user: superAdminUser._id,
      permissions: {
        manageUsers: true,
        manageRoles: true,
        manageDistricts: true,
        manageClubs: true,
        manageMarketplace: true,
        manageLeaderboard: true,
        manageSettings: true,
        viewAnalytics: true,
        systemAccess: true
      }
    });
    
    await superAdminRecord.save();
    console.log('Created SuperAdmin record');
    
    console.log('\n✅ Super Admin created successfully!');
    console.log('📧 Email:', superAdminUser.email);
    console.log('🔑 Role:', superAdminUser.role);
    console.log('🔐 Passcode:', process.env.SUPER_ADMIN_PASSCODE || '1234');
    console.log('\nYou can now login with Google OAuth using this email.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating Super Admin:', error);
    process.exit(1);
  }
};

createSuperAdmin();