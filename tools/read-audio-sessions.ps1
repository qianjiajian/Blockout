# Read-only Windows output-session diagnostics. Does not mute, stop, or change
# any application, and does not inspect browser profiles or player storage.
param([int]$Rounds = 1, [string]$OutputPath = "")

Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;

namespace BlockOutAudioProbe {
  [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
  class DeviceEnumeratorCom {}

  [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IDeviceEnumerator {
    int EnumAudioEndpoints(int flow, uint mask, out IntPtr devices);
    [PreserveSig] int GetDefaultAudioEndpoint(int flow, int role, out IDevice endpoint);
  }
  [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IDevice {
    [PreserveSig] int Activate(ref Guid iid, uint context, IntPtr parameters, [MarshalAs(UnmanagedType.IUnknown)] out object result);
  }
  [ComImport, Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface ISessionManager {
    int GetAudioSessionControl(IntPtr guid, uint flags, out IntPtr control);
    int GetSimpleAudioVolume(IntPtr guid, uint flags, out IntPtr volume);
    [PreserveSig] int GetSessionEnumerator(out ISessionEnumerator sessions);
  }
  [ComImport, Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface ISessionEnumerator {
    [PreserveSig] int GetCount(out int count);
    [PreserveSig] int GetSession(int index, [MarshalAs(UnmanagedType.IUnknown)] out object control);
  }
  [ComImport, Guid("BFB7FF88-7239-4FC9-8FA2-07C950BE9C6D"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface ISessionControl2 {
    [PreserveSig] int GetState(out int state);
    int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string name);
    int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string name, IntPtr guid);
    int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string path);
    int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string path, IntPtr guid);
    int GetGroupingParam(out Guid guid);
    int SetGroupingParam(ref Guid guid, IntPtr context);
    int RegisterAudioSessionNotification(IntPtr client);
    int UnregisterAudioSessionNotification(IntPtr client);
    int GetSessionIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string id);
    int GetSessionInstanceIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string id);
    [PreserveSig] int GetProcessId(out uint id);
  }
  [ComImport, Guid("C02216F6-8C67-4B5B-9D00-D008E73E0064"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioMeter {
    [PreserveSig] int GetPeakValue(out float peak);
  }
  public class SessionResult {
    public uint ProcessId;
    public string ProcessName;
    public int State;
    public float Peak;
  }
  public static class Reader {
    public static List<SessionResult> Read() {
      var deviceEnumerator = (IDeviceEnumerator)new DeviceEnumeratorCom();
      IDevice device;
      Marshal.ThrowExceptionForHR(deviceEnumerator.GetDefaultAudioEndpoint(0, 0, out device));
      var id = new Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F");
      object managerObject;
      Marshal.ThrowExceptionForHR(device.Activate(ref id, 23, IntPtr.Zero, out managerObject));
      var manager = (ISessionManager)managerObject;
      ISessionEnumerator sessions;
      Marshal.ThrowExceptionForHR(manager.GetSessionEnumerator(out sessions));
      int count;
      Marshal.ThrowExceptionForHR(sessions.GetCount(out count));
      var result = new List<SessionResult>();
      var controls = new List<object>();
      try {
        for (int index = 0; index < count; index++) {
          object raw;
          Marshal.ThrowExceptionForHR(sessions.GetSession(index, out raw));
          controls.Add(raw);
          var control = (ISessionControl2)raw;
          uint pid; int state;
          Marshal.ThrowExceptionForHR(control.GetProcessId(out pid));
          Marshal.ThrowExceptionForHR(control.GetState(out state));
          string name;
          try { name = Process.GetProcessById((int)pid).ProcessName; } catch { name = "system-or-ended"; }
          result.Add(new SessionResult { ProcessId = pid, ProcessName = name, State = state });
        }
        for (int sample = 0; sample < 20; sample++) {
          for (int index = 0; index < controls.Count; index++) {
            var meter = controls[index] as IAudioMeter;
            if (meter == null) continue;
            float peak;
            if (meter.GetPeakValue(out peak) == 0) result[index].Peak = Math.Max(result[index].Peak, peak);
          }
          Thread.Sleep(100);
        }
      } finally {
        foreach (var control in controls) Marshal.ReleaseComObject(control);
        Marshal.ReleaseComObject(sessions);
        Marshal.ReleaseComObject(managerObject);
        Marshal.ReleaseComObject(device);
        Marshal.ReleaseComObject(deviceEnumerator);
      }
      return result;
    }
  }
}
'@
for ($round = 0; $round -lt $Rounds; $round++) {
  $sampleStartedAt = [DateTime]::UtcNow.ToString("o")
  $sessions = [BlockOutAudioProbe.Reader]::Read()
  if ($OutputPath) {
    $record = @{ startedAt = $sampleStartedAt; endedAt = [DateTime]::UtcNow.ToString("o"); sessions = $sessions }
    if (Test-Path -LiteralPath "playtest-results/audio-live-20261007/latest.json") {
      $diagnostic = Get-Content -LiteralPath "playtest-results/audio-live-20261007/latest.json" -Raw | ConvertFrom-Json
      $record.probe = @{ receivedAt = $diagnostic.receivedAt; probeId = $diagnostic.audio.probeId; testPhase = $diagnostic.audio.phase; contextStates = @($diagnostic.audio.contexts.state) }
    }
    Add-Content -LiteralPath $OutputPath -Value ($record | ConvertTo-Json -Depth 8 -Compress) -Encoding utf8
  } else {
    $sessions | ConvertTo-Json
  }
}
