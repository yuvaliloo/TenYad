
// import { getOpenTasks } from "../services/fire";
// import { getDocs } from "firebase/firestore";

// jest.mock("firebase/firestore", () => ({
//   getDocs: jest.fn(),
//   collection: jest.fn(),
//   query: jest.fn(),
//   where: jest.fn(),
// }));

// test("published open task appears in tasker feed", async () => {
//   // 1. Setting up the conditions
//   const mockTasks = [
//     {
//       title: "Fix sink",
//       status: "open",
//       budget: 150,
//     },
//   ];

//   getDocs.mockResolvedValue({
//     docs: mockTasks.map(task => ({
//       data: () => task,
//     })),
//   });

//   // 2. Calling the function under test
//   const tasks = await getOpenTasks();

//   // 3. Assertions
//   expect(getDocs).toHaveBeenCalledTimes(1);
//   expect(tasks.length).toBe(1);
//   expect(tasks[0].status).toBe("open");
//   expect(tasks[0].title).toBe("Fix sink");
// });
