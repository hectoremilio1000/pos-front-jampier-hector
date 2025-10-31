import apiAuth from "./apiAuth";

export const linkOrganization = (id: number, name: string) =>
  apiAuth.post(`/restaurants/${id}/facturapi/link`, { name });

export const updateLegal = (id: number, payload: any) =>
  apiAuth.put(`/restaurants/${id}/facturapi/legal`, payload);

export const uploadCsd = (id: number, formData: FormData) =>
  apiAuth.put(`/restaurants/${id}/facturapi/csd`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteCsd = (id: number) =>
  apiAuth.delete(`/restaurants/${id}/facturapi/csd`);

export const getOrgStatus = (id: number) =>
  apiAuth.get(`/restaurants/${id}/facturapi/status`);

export const getTestKey = (id: number) =>
  apiAuth.get(`/restaurants/${id}/facturapi/keys/test`);

export const listLiveKeys = (id: number) =>
  apiAuth.get(`/restaurants/${id}/facturapi/keys/live`);
