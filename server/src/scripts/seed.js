require('module-alias/register');

const mongoose = require('mongoose');

const Area = require('@modules/rooms/area.model');
const Hostel = require('@modules/rooms/hostel.model');
const Landlord = require('@modules/rooms/landlord.model');
const Room = require('@modules/rooms/room.model');

const useTest = process.argv.includes('--test');
const uri =
  process.env[useTest ? 'MONGODB_URI_TEST' : 'MONGODB_URI'] ||
  `mongodb://127.0.0.1:27017/room4u${useTest ? '_test' : ''}`;

const seed = async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log(`Seeding ${useTest ? 'TEST' : ''} database at ${uri}`);

  await Promise.all([
    Area.deleteMany({}),
    Hostel.deleteMany({}),
    Landlord.deleteMany({}),
    Room.deleteMany({}),
  ]);

  const [chibavi, luwinga, katoto] = await Area.create([
    { name: 'Chibavi' },
    { name: 'Luwinga' },
    { name: 'Katoto' },
  ]);

  const [mommaNora, mrZgambo, mrsMhango, chiefKumwenda] = await Landlord.create([
    { name: 'Nora Banda', phone: '0995 111 222', whatsapp: '0995 111 222' },
    { name: 'Zgambo Phiri', phone: '0888 333 444', whatsapp: '0888 333 444' },
    { name: 'Mhango Mwale', phone: '0999 555 666', whatsapp: '0999 555 666' },
    { name: 'Kumwenda Jere', phone: '0881 777 888', whatsapp: '0881 777 888' },
  ]);

  const [chibaviHostel, luwingaHostel, katotoHostel, noPinHostel, zolozoloHostel] =
    await Hostel.create([
      {
        name: 'Chibavi Hostel',
        area_id: chibavi._id,
        caretaker_name: 'George',
        caretaker_phone: '0881 000 111',
        lat: -11.439266,
        lng: 34.0257,
      },
      {
        name: 'Luwinga Hostel',
        area_id: luwinga._id,
        caretaker_name: 'Memory',
        caretaker_phone: '0990 222 333',
        lat: -11.449741,
        lng: 34.0109,
      },
      {
        name: 'Katoto Hostel',
        area_id: katoto._id,
        caretaker_name: 'Old Mathews',
        caretaker_phone: '0882 444 555',
        lat: -11.429053,
        lng: 34.0286,
      },
      {
        name: 'Masasa Hostel',
        area_id: luwinga._id,
        caretaker_name: 'Falesi',
        caretaker_phone: '0992 555 444',
        lat: -11.4522,
        lng: 34.0204,
      },
      {
        name: 'Zolozolo Hostel',
        area_id: katoto._id,
        caretaker_name: 'Agness',
        caretaker_phone: '0991 666 777',
        lat: -11.4215,
        lng: 34.0322,
      },
    ]);

  await Room.create([
    {
      hostel_id: chibaviHostel._id,
      landlord_id: mommaNora._id,
      type: 'shared',
      beds: 3,
      beds_left: 2,
      price: 20000,
      available_from: new Date('2026-09-01'),
      photos: ['/photos/hostel-1.jpg', '/photos/hostel-7.jpg'],
      status: 'stock',
      deposit_paid_at: new Date(),
    },
    {
      hostel_id: chibaviHostel._id,
      landlord_id: mommaNora._id,
      type: 'single',
      beds: 1,
      beds_left: 1,
      price: 15000,
      available_from: new Date('2026-09-15'),
      photos: ['/photos/hostel-2.jpg'],
      status: 'stock',
      deposit_paid_at: new Date(),
    },
    {
      hostel_id: luwingaHostel._id,
      landlord_id: mrZgambo._id,
      type: 'shared',
      beds: 4,
      beds_left: 4,
      price: 18000,
      available_from: new Date('2026-09-01'),
      photos: ['/photos/hostel-3.jpg', '/photos/hostel-8.jpg'],
      status: 'stock',
      deposit_paid_at: new Date(),
    },
    {
      hostel_id: luwingaHostel._id,
      landlord_id: mrZgambo._id,
      type: 'single',
      beds: 1,
      beds_left: 1,
      price: 12000,
      available_from: new Date('2026-08-20'),
      photos: ['/photos/hostel-4.jpg'],
      status: 'stock',
      deposit_paid_at: new Date(),
    },
    {
      hostel_id: katotoHostel._id,
      landlord_id: mrsMhango._id,
      type: 'single',
      beds: 1,
      beds_left: 1,
      price: 10000,
      available_from: new Date('2026-09-01'),
      photos: ['/photos/hostel-5.jpg'],
      status: 'stock',
      deposit_paid_at: new Date(),
    },
    {
      hostel_id: noPinHostel._id,
      landlord_id: mrsMhango._id,
      type: 'shared',
      beds: 2,
      beds_left: 2,
      price: 16000,
      available_from: new Date('2026-09-01'),
      photos: ['/photos/hostel-6.jpg'],
      status: 'stock',
      deposit_paid_at: new Date(),
    },
    {
      hostel_id: zolozoloHostel._id,
      landlord_id: chiefKumwenda._id,
      type: 'shared',
      beds: 3,
      beds_left: 3,
      price: 17000,
      available_from: new Date('2026-09-05'),
      photos: ['/photos/hostel-1.jpg', '/photos/hostel-4.jpg'],
      status: 'stock',
      deposit_paid_at: new Date(),
    },
    {
      hostel_id: chibaviHostel._id,
      landlord_id: mommaNora._id,
      type: 'shared',
      beds: 2,
      beds_left: 2,
      price: 14000,
      available_from: new Date('2026-09-01'),
      photos: ['/photos/hostel-7.jpg'],
      status: 'lead',
    },
    {
      hostel_id: luwingaHostel._id,
      landlord_id: mrZgambo._id,
      type: 'shared',
      beds: 2,
      beds_left: 2,
      price: 17000,
      available_from: new Date('2026-09-01'),
      photos: ['/photos/hostel-8.jpg'],
      status: 'rented',
      rented: true,
      rented_at: new Date(),
      deposit_paid_at: new Date(),
    },
    {
      hostel_id: katotoHostel._id,
      landlord_id: mrsMhango._id,
      type: 'shared',
      beds: 3,
      beds_left: 0,
      price: 19000,
      available_from: new Date('2026-09-01'),
      photos: ['/photos/hostel-3.jpg'],
      status: 'stock',
      rented: true,
      rented_at: new Date(),
      deposit_paid_at: new Date(),
    },
  ]);

  const stockCount = await Room.countDocuments({ status: 'stock', beds_left: { $gte: 1 } });
  console.log(`Seeded. Publicly visible rooms: ${stockCount}`);
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
