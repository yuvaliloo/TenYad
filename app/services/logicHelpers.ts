type User = {
  uid: string;
  displayName: string;
};

type RequestObject = {
  title: string;
  description: string;
  address: string;
  seekerId: string;
  seekerName: string;
  status: 'open';
  worker: 'OPEN';
};

export const createRequestObject = (
  title: string,
  description: string,
  address: string,
  user: User
): RequestObject | null => {
  if (!title || !description || !address) return null;

  return {
    title,
    description,
    address,
    seekerId: user.uid,
    seekerName: user.displayName,
    status: 'open',
    worker: 'OPEN',
  };
};

export const processFeedForTasker = (
  allRequests: any[],
  currentUserId: string
) => {
  return allRequests
    .filter(req => req.seekerId !== currentUserId) // Filter out own requests
    .filter(req => !req.worker || req.worker === "OPEN"); // Filter only unassigned tasks
};
