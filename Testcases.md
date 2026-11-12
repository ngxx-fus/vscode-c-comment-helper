# Comment Fold Helper Test Cases

Test cases for extracting titles and generating clean 1-line fold previews.

---

## Case 0: Multi-line Requirement Block

### Input

```c
/**
 * @req{gpt_one_shot_pulse_mode,SWFLEX-3910,GPT_Open} The GPT shall support configuring One-Shot Pulse Mode.
 *
 * @verify{gpt_one_shot_pulse_mode} Two pulses are generated while interrupts disabled.
 */
```

### Extracted Title

```text
@req{gpt_one_shot_pulse_mode,SWFLEX-3910,GPT_Open} The GPT shall support configuring One-Shot Pulse Mode.
```

### Generated Preview

```c
/** @req{gpt_one_shot_pulse_mode,SWFLEX-3910,GPT_Open} The GPT shall support configuring One... */
```

*(Automatically cropped to keep line $\le$ 100 columns)*

---

## Case 1: Multi-line Descriptive Note

### Input

```c
/* Note about why the remainder of this test is compiled out:
 *  - One-shot pulse output is working correctly, as verified manually on the scope.
 *  - The issue is that "GPT Capture" does not appear to be working for anything but symmetric, periodic signals.
 *  - It seems that GTTCR isn't valid for some time after the capture interrupt. This means that the capture value provided by the driver is always for the previous capture. Also that one-shot capture is not possible.
 *  - Fix-it ticket Jira: https://jira.example.com/browse/TIMER-2933 */
```

### Extracted Title

```text
Note about why the remainder of this test is compiled out:
```

### Generated Preview

```c
/** Note about why the remainder of this test is compiled out: */
```

---

## Case 2: Decorative Box Banner

### Input

```c
    /*============================================================*
     *=========           Verify GTIOCA Timing           =========*
     *============================================================*/
```

### Extracted Title

```text
Verify GTIOCA Timing
```

### Generated Preview

```c
    /** Verify GTIOCA Timing */
```

---

## Case 3: Long Doxygen Requirement & Detailed Test Plan

### Input

```c
/**
 * @req{gpt_pwm_dead_time,SWFLEX-592,GPT_Open} The GPT shall support adding dead time in the PWM waveforms generated on GTIOCA and GTIOCB.
 *
 * @verify{gpt_pwm_dead_time} The high level and low level waveforms of GTIOC pins match expected values for asymmetric
 * PWM with dead time when they are measured with an input capture timer.
 *
 * Confirm dead time by:
 * - Reading GIOTCA period
 * - Reading GIOTCA pulse (active-high) time
 * - Reading GIOTCB period
 * - Reading GIOTCB pulse (active-low) time
 * - Compare
 *
 * GIOTCB pulse time should be GIOTCA + dead time.
 * Dead time is
 * - 2 * GTDVU for timer units that don't support GTDVD (for non-GPTE/H)
 * - GTDVU + GTDVD for timer units that do support GTDVD (for GPTE/H)
 * - N/A for timer units that don't support GTDVU or GTDVD (fail test in this case - all MCUs have at least one timer unit with support.)
 */
```

### Extracted Title

```text
@req{gpt_pwm_dead_time,SWFLEX-592,GPT_Open} The GPT shall support adding dead time in the PWM waveforms generated on GTIOCA and GTIOCB.
```

### Generated Preview

```c
/** @req{gpt_pwm_dead_time,SWFLEX-592,GPT_Open} The GPT shall support adding dead time in th... */
```

*(Automatically cropped to keep line $\le$ 100 columns)*

---

## Case 4: Dual-token Header with `@defgroup`

### Input

```c
/*******************************************************************************************************************//**
 * @defgroup GPT_TESTS GPT Tests
 * @ingroup DRIVER_TESTS
 *
 * @{
 **********************************************************************************************************************/
```

### Extracted Title

```text
@defgroup GPT_TESTS GPT Tests
```

### Generated Preview

```c
/** @defgroup GPT_TESTS GPT Tests */
```

---

## Case 5: Single-line Opening with Multiple Tags

### Input

```c
/** @req{gpt_pwm_dead_time,SWFLEX-592,GPT_Open} The GPT shall support adding dead time in the PWM waveforms generated on GTIOCA and GTIOCB.
 *  @verify{gpt_pwm_dead_time} The high level and low level waveforms of GTIOC pins match expected values for asymmetric
 *  PWM with dead time when they are measured with an input capture timer. */
```

### Extracted Title

```text
@req{gpt_pwm_dead_time,SWFLEX-592,GPT_Open} The GPT shall support adding dead time in the PWM waveforms generated on GTIOCA and GTIOCB.
```

### Generated Preview

```c
/** @req{gpt_pwm_dead_time,SWFLEX-592,GPT_Open} The GPT shall support adding dead time in th... */
```

*(Automatically cropped to keep line $\le$ 100 columns)*

## Case 6: Single-line Opening with Multiple Tags

### Input

```c
/*******************************************************************************************************************//**
 * Get timer information and store it in provided pointer p_info. Implements @ref timer_api_t::infoGet.
 *
 * Example:
 * @snippet timer_example.c timer_info_get
 *
 * @retval STATUS_SUCCESS              Period, count direction, frequency, and ELC event written to caller's
 *                                     structure successfully.
 * @retval ERR_ASSERTION               p_ctrl or p_info was NULL.
 * @retval ERR_NOT_OPEN                The instance is not opened.
 **********************************************************************************************************************/
```

### Extracted Title

```text
Get timer information and store it in provided pointer p_info. Implements @ref timer_api_t::infoGet.
```

### Generated Preview

```c
/** Get timer information and store it in provided pointer p_info. Implements @ref timer_api_t::infoGet. */
```

*(Automatically cropped to keep line $\le$ 100 columns)*

## Case 7: Single-line Opening with Multiple Tags

### Input

```c
            /*
             * In TIMER_MODE_TRIANGLE_WAVE_ASYMMETRIC_PWM_MODE3, if this is a crest duty cycle, then update the crest
             * duty cycle register. Otherwise, update the trough duty cycle register.
             * Or in case of One-Shot pulse mode, buffer registers are either GTCCRC and GTCCRD for pulses on GTIOCnA
             * pin or GTCCRE and GTCCRF for pulses on GTIOCnB pin.
             * Hence update registers GTCCRD, GTCCRF for trailing edge dutycycle counts on GTIOCnA, GTIOCnB
             * respectively, otherwise update registers GTCCRC,GTCCRE for leading edge dutycycle counts on GTIOCnA,
             * GTIOCnB respectively.
             */
```

### Extracted Title

```text
In TIMER_MODE_TRIANGLE_WAVE_ASYMMETRIC_PWM_MODE3, if this is a crest duty cycle, then update the crest
```

### Generated Preview

```c
            /** In TIMER_MODE_TRIANGLE_WAVE_ASYMMETRIC_PWM_MODE3, if this is a crest duty cycle, then update the crest */
```

*(Automatically cropped to keep line $\le$ 100 columns)*

## Case 8: Single-line Opening with Multiple Tags

### Input

```c
    /**
     * On the RA6T2, channels [0,3] are PWM Output Delay Circuit channels.
     *
     * Verify that an error is returned if the channel is not a PWM Output Delay Circuit channel.
     */
```

### Extracted Title

```text
On the RA6T2, channels [0,3] are PWM Output Delay Circuit channels.
```

### Generated Preview

```c
    /** On the RA6T2, channels [0,3] are PWM Output Delay Circuit channels. */
```


NOTE: Get the col of `    /**`

*(Automatically cropped to keep line $\le$ 100 columns)*

## Case X: Single-line Opening with Multiple Tags

### Input

```c

```

### Extracted Title

```text

```

### Generated Preview

```c
/**  */
```

*(Automatically cropped to keep line $\le$ 100 columns)*
