import { format as fnsFormat } from "date-fns";
export const formatDateTime = (
  timestamp: number,
  format = "MM/dd HH:mm"
): string => {
  const date = new Date(timestamp);

  if (date.getMinutes() === 0) {
    format = format.replace(" HH", " H");
    format = format.replace(":mm", "点");
    // if (date.getHours() === 0) {
    //   format = format.replace(" HH:mm", "日").replace("/", "月");
    // } else {
    //   format = format.replace(":mm", "点");
    // }
  }
  return fnsFormat(new Date(timestamp), format);
};
